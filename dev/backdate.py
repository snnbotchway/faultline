# Moves the seeded events back to when they happened.
#
# GlitchTip dates everything by arrival: an event's arrival time is encoded in its id
# (UUIDv7), and the issue's first/last seen and the hourly counters follow it. The seed
# sends two weeks of events in a few seconds, so without this step every issue is new
# and every chart is one bar. Each event carries the time it happened, and this script
# makes the arrival data agree with it, for one organization:
#
#   1. create the partitions the older rows need
#   2. give each event an id for the time it happened
#   3. set each issue's first and last seen, and first and last release, from its events
#   4. rebuild the hourly counts per issue and per project, and the daily tag counts
#   5. date each release as dev/sample-events.ts says
#
# It reaches into the backend's tables, so it is tied to the backend version pinned in
# dev/compose.yml (checked against GlitchTip 7.0.0). Running it again changes nothing.
#
# Run by dev/seed.ts:
#   docker compose -f dev/compose.yml exec -T -e SEED_ORG=… -e SEED_RELEASES=… web ./manage.py shell -c "$(cat dev/backdate.py)"
import json
import os
from datetime import datetime, timedelta

from django.db import connection, transaction
from django.utils import timezone

from apps.issue_events.models import Issue, IssueEvent, IssueIndex
from apps.organizations_ext.models import Organization
from apps.releases.models import Release
from glitchtip.base_commands import MakeSampleCommand
from glitchtip.partition_manager import UUID7Helper

org = Organization.objects.get(slug=os.environ["SEED_ORG"])
release_dates = json.loads(os.environ.get("SEED_RELEASES", "{}"))
now = timezone.now()

events = list(IssueEvent.objects.filter(organization=org).values_list("id", "timestamp"))
if events:
    oldest = min(timestamp for _, timestamp in events)
    MakeSampleCommand()._ensure_partitions(
        min(oldest, now - timedelta(days=15)),
        now,
        daily_tables=["issue_events_issueevent"],
        weekly_tables=[
            "issue_events_issueaggregate",
            "issue_events_issuetag",
            "projects_issueeventprojecthourlystatistic",
        ],
    )

MILLISECOND = timedelta(milliseconds=1)
moved = 0
with transaction.atomic(), connection.cursor() as cursor:
    for event_id, timestamp in events:
        if abs(UUID7Helper.extract_datetime(event_id) - timestamp) <= MILLISECOND:
            continue
        cursor.execute(
            "UPDATE issue_events_issueevent SET id = %s WHERE id = %s AND organization_id = %s",
            [UUID7Helper.from_datetime(timestamp), event_id, org.id],
        )
        moved += 1

    cursor.execute(
        "SELECT issue_id, min(timestamp), max(timestamp) FROM issue_events_issueevent "
        "WHERE organization_id = %s GROUP BY issue_id",
        [org.id],
    )
    for issue_id, first_seen, last_seen in cursor.fetchall():
        ordered = IssueEvent.objects.filter(organization=org, issue_id=issue_id).order_by("timestamp")
        Issue.objects.filter(id=issue_id).update(first_seen=first_seen, first_release_id=ordered.first().release_id)
        IssueIndex.objects.filter(issue_id=issue_id, organization_id=org.id).update(
            last_seen=last_seen, last_release_id=ordered.last().release_id
        )

    cursor.execute("DELETE FROM issue_events_issueaggregate WHERE organization_id = %s", [org.id])
    cursor.execute(
        "INSERT INTO issue_events_issueaggregate (date, organization_id, issue_id, count) "
        "SELECT date_trunc('hour', timestamp), organization_id, issue_id, count(*) "
        "FROM issue_events_issueevent WHERE organization_id = %s GROUP BY 1, 2, 3",
        [org.id],
    )
    cursor.execute("DELETE FROM projects_issueeventprojecthourlystatistic WHERE organization_id = %s", [org.id])
    cursor.execute(
        "INSERT INTO projects_issueeventprojecthourlystatistic (date, organization_id, project_id, count) "
        "SELECT date_trunc('hour', e.timestamp), e.organization_id, i.project_id, count(*) "
        "FROM issue_events_issueevent e JOIN issue_events_issue i ON i.id = e.issue_id "
        "WHERE e.organization_id = %s GROUP BY 1, 2, 3",
        [org.id],
    )
    cursor.execute("DELETE FROM issue_events_issuetag WHERE organization_id = %s", [org.id])
    cursor.execute(
        "INSERT INTO issue_events_issuetag (date, issue_id, organization_id, tag_key_id, tag_value_id, count) "
        "SELECT date_trunc('day', e.timestamp), e.issue_id, e.organization_id, k.id, v.id, count(*) "
        "FROM issue_events_issueevent e, jsonb_each_text(e.tags) AS tag "
        "JOIN issue_events_tagkey k ON k.key = tag.key "
        "JOIN issue_events_tagvalue v ON v.value = tag.value "
        "WHERE e.organization_id = %s GROUP BY 1, 2, 3, 4, 5",
        [org.id],
    )
    for version, created in release_dates.items():
        Release.objects.filter(organization=org, version=version).update(created=datetime.fromisoformat(created))

print(f"backdated {moved} of {len(events)} events")
