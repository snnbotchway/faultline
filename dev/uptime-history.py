# Gives the seeded uptime monitors two weeks of check history.
#
# The backend only records a check when it runs one, so a freshly seeded monitor has a few
# minutes of history and nothing on it is slow, flapping or recovered. This script writes the
# checks each monitor would have had, as described in SEED_UPTIME (see dev/seed.ts), then sets the
# monitor's cached state from the newest of them, as the backend's own check task does. It also
# puts the listed monitors on the status page, which the API cannot do.
#
# It reaches into the backend's tables, so it is tied to the backend version pinned in
# dev/compose.yml (checked against GlitchTip 7.0.0). A monitor that already has its history is
# left alone, so running it again changes nothing.
#
# Run by dev/seed.ts:
#   docker compose -f dev/compose.yml exec -T -e SEED_ORG=… -e SEED_UPTIME=… web ./manage.py shell -c "$(cat dev/uptime-history.py)"
import json
import os
import random
from datetime import timedelta

from django.db import DatabaseError, transaction
from django.utils import timezone

from apps.organizations_ext.models import Organization
from apps.uptime.models import Monitor, MonitorCheck, StatusPage
from glitchtip.base_commands import MakeSampleCommand
from glitchtip.partition_manager import UUID7Helper

DAYS = 14
# More checks than this means the monitor already has its history.
BACKFILLED = 500

org = Organization.objects.get(slug=os.environ["SEED_ORG"])
spec = json.loads(os.environ["SEED_UPTIME"])
now = timezone.now()
# The backend keeps checks in daily partitions for its first days and weekly ones after, so a day
# may already be covered by a week; only the days nothing covers yet get a partition.
for days_ago in range(DAYS + 1, -1, -1):
    day = now - timedelta(days=days_ago)
    try:
        with transaction.atomic():
            MakeSampleCommand()._ensure_partitions(day, day, daily_tables=["uptime_monitorcheck"])
    except DatabaseError:
        pass

filled = 0
for name, history in spec["monitors"].items():
    monitor = Monitor.objects.filter(organization=org, name=name).first()
    if monitor is None or MonitorCheck.objects.filter(monitor=monitor).count() > BACKFILLED:
        continue
    rand = random.Random(name)
    heartbeat = monitor.monitor_type == "Heartbeat"
    limit = (monitor.timeout or 20) * 1000
    outages = [
        (now - timedelta(minutes=o["ago"]), None if o.get("lasts") is None else now - timedelta(minutes=o["ago"] - o["lasts"]), o["reason"])
        for o in history.get("outages", [])
    ]
    count = int(DAYS * 86400 / monitor.interval)
    checks = []
    state = None
    last_change = None
    for step in range(count, -1, -1):
        at = now - timedelta(seconds=step * monitor.interval)
        outage = next((o for o in outages if o[0] <= at and (o[1] is None or at < o[1])), None)
        is_up = outage is None
        reason = None if is_up else outage[2]
        if heartbeat:
            response = None
        elif reason == 1:
            response = limit
        else:
            spike = history.get("base", 100) * (0.8 + rand.random()) if rand.random() < history.get("spikes", 0) else 0
            response = int(min(history.get("base", 100) + rand.random() * history.get("spread", 40) + spike, limit * 0.96))
        is_change = is_up != state
        if is_change:
            last_change = at
        state = is_up
        checks.append(
            MonitorCheck(
                id=UUID7Helper.from_datetime(at),
                monitor=monitor,
                organization=org,
                is_up=is_up,
                is_change=is_change,
                reason=reason,
                response_time=response,
            )
        )
    with transaction.atomic():
        MonitorCheck.objects.filter(monitor=monitor).delete()
        MonitorCheck.objects.bulk_create(checks, batch_size=2000)
        Monitor.objects.filter(pk=monitor.pk).update(
            cached_is_up=state,
            cached_last_change=last_change,
            cached_consecutive_down=0 if state else monitor.confirmation_threshold,
        )
    filled += 1

for page_name, names in spec.get("statusPages", {}).items():
    page = StatusPage.objects.filter(organization=org, name=page_name).first()
    if page is not None:
        page.monitors.add(*Monitor.objects.filter(organization=org, name__in=names))

print(f"Gave {filled} monitors their check history.")
