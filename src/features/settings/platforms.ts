import { messages } from '@/i18n'

// The platforms a project can name, each with the two things to paste: the install command and the SDK's start-up code.
// `id` is the value the backend stores; GlitchTip takes any Sentry SDK.
export const PlatformGroup = { browser: 'Browser', server: 'Server', mobile: 'Mobile', other: 'Other' } as const
export type PlatformGroup = (typeof PlatformGroup)[keyof typeof PlatformGroup]

export type Platform = { id: string; name: string; group: PlatformGroup; install: string; file: string; code: (dsn: string) => string }

// The share of transactions the snippets send, low enough that tracing costs little until someone raises it.
const TRACES_SAMPLE_RATE = 0.01

const js = (pkg: string, extra = '') => (dsn: string) =>
  `import * as Sentry from "${pkg}";\n\nSentry.init({\n  dsn: "${dsn}",${extra}\n  tracesSampleRate: ${TRACES_SAMPLE_RATE},\n});`

const py = (integration = '') => (dsn: string) =>
  `import sentry_sdk\n\nsentry_sdk.init(\n    dsn="${dsn}",${integration}\n    traces_sample_rate=${TRACES_SAMPLE_RATE},\n)`

// For a platform not on the list: the DSN on its own.
const OTHER: Platform = { id: 'other', name: 'Other', group: PlatformGroup.other, install: '', file: 'DSN', code: (dsn) => dsn }

export const PLATFORMS: Platform[] = [
  { id: 'javascript', name: 'Browser JavaScript', group: PlatformGroup.browser, install: 'npm install @sentry/browser', file: 'main.js', code: js('@sentry/browser') },
  { id: 'javascript-react', name: 'React', group: PlatformGroup.browser, install: 'npm install @sentry/react', file: 'src/main.tsx', code: js('@sentry/react') },
  { id: 'javascript-nextjs', name: 'Next.js', group: PlatformGroup.browser, install: 'npm install @sentry/nextjs', file: 'instrumentation-client.ts', code: js('@sentry/nextjs') },
  { id: 'javascript-vue', name: 'Vue', group: PlatformGroup.browser, install: 'npm install @sentry/vue', file: 'src/main.ts', code: js('@sentry/vue', '\n  app,') },
  { id: 'javascript-angular', name: 'Angular', group: PlatformGroup.browser, install: 'npm install @sentry/angular', file: 'src/main.ts', code: js('@sentry/angular') },
  { id: 'javascript-svelte', name: 'Svelte', group: PlatformGroup.browser, install: 'npm install @sentry/svelte', file: 'src/main.ts', code: js('@sentry/svelte') },
  { id: 'node', name: 'Node.js', group: PlatformGroup.server, install: 'npm install @sentry/node', file: 'instrument.js', code: js('@sentry/node') },
  { id: 'node-express', name: 'Express', group: PlatformGroup.server, install: 'npm install @sentry/node', file: 'instrument.js', code: js('@sentry/node') },
  { id: 'python', name: 'Python', group: PlatformGroup.server, install: 'pip install sentry-sdk', file: 'main.py', code: py() },
  { id: 'python-django', name: 'Django', group: PlatformGroup.server, install: 'pip install "sentry-sdk[django]"', file: 'settings.py', code: py('\n    send_default_pii=False,') },
  { id: 'python-flask', name: 'Flask', group: PlatformGroup.server, install: 'pip install "sentry-sdk[flask]"', file: 'app.py', code: py() },
  { id: 'python-fastapi', name: 'FastAPI', group: PlatformGroup.server, install: 'pip install "sentry-sdk[fastapi]"', file: 'main.py', code: py() },
  {
    id: 'go',
    name: 'Go',
    group: PlatformGroup.server,
    install: 'go get github.com/getsentry/sentry-go',
    file: 'main.go',
    code: (dsn) => `err := sentry.Init(sentry.ClientOptions{\n\tDsn:              "${dsn}",\n\tTracesSampleRate: ${TRACES_SAMPLE_RATE},\n})\nif err != nil {\n\tlog.Fatalf("sentry.Init: %s", err)\n}\ndefer sentry.Flush(2 * time.Second)`,
  },
  {
    id: 'ruby-rails',
    name: 'Rails',
    group: PlatformGroup.server,
    install: 'bundle add sentry-ruby sentry-rails',
    file: 'config/initializers/sentry.rb',
    code: (dsn) => `Sentry.init do |config|\n  config.dsn = "${dsn}"\n  config.traces_sample_rate = ${TRACES_SAMPLE_RATE}\nend`,
  },
  {
    id: 'php-laravel',
    name: 'Laravel',
    group: PlatformGroup.server,
    install: 'composer require sentry/sentry-laravel',
    file: '.env',
    code: (dsn) => `SENTRY_LARAVEL_DSN=${dsn}\nSENTRY_TRACES_SAMPLE_RATE=${TRACES_SAMPLE_RATE}`,
  },
  {
    id: 'java-spring-boot',
    name: 'Spring Boot',
    group: PlatformGroup.server,
    install: 'implementation("io.sentry:sentry-spring-boot-starter-jakarta:8.0.0")',
    file: 'application.properties',
    code: (dsn) => `sentry.dsn=${dsn}\nsentry.traces-sample-rate=${TRACES_SAMPLE_RATE}`,
  },
  {
    id: 'csharp-aspnetcore',
    name: 'ASP.NET Core',
    group: PlatformGroup.server,
    install: 'dotnet add package Sentry.AspNetCore',
    file: 'Program.cs',
    code: (dsn) => `builder.WebHost.UseSentry(options =>\n{\n    options.Dsn = "${dsn}";\n    options.TracesSampleRate = ${TRACES_SAMPLE_RATE};\n});`,
  },
  {
    id: 'rust',
    name: 'Rust',
    group: PlatformGroup.server,
    install: 'cargo add sentry',
    file: 'src/main.rs',
    code: (dsn) => `let _guard = sentry::init(("${dsn}", sentry::ClientOptions {\n    release: sentry::release_name!(),\n    ..Default::default()\n}));`,
  },
  {
    id: 'elixir',
    name: 'Elixir',
    group: PlatformGroup.server,
    install: '{:sentry, "~> 11.0"}',
    file: 'config/config.exs',
    code: (dsn) => `config :sentry,\n  dsn: "${dsn}",\n  environment_name: Mix.env()`,
  },
  { id: 'react-native', name: 'React Native', group: PlatformGroup.mobile, install: 'npm install @sentry/react-native', file: 'App.tsx', code: js('@sentry/react-native') },
  {
    id: 'flutter',
    name: 'Flutter',
    group: PlatformGroup.mobile,
    install: 'flutter pub add sentry_flutter',
    file: 'lib/main.dart',
    code: (dsn) => `await SentryFlutter.init(\n  (options) => options.dsn = '${dsn}',\n  appRunner: () => runApp(const MyApp()),\n);`,
  },
  {
    id: 'android',
    name: 'Android',
    group: PlatformGroup.mobile,
    install: 'implementation("io.sentry:sentry-android:8.0.0")',
    file: 'AndroidManifest.xml',
    code: (dsn) => `<meta-data android:name="io.sentry.dsn"\n    android:value="${dsn}" />`,
  },
  {
    id: 'apple-ios',
    name: 'iOS',
    group: PlatformGroup.mobile,
    install: '.package(url: "https://github.com/getsentry/sentry-cocoa", from: "9.0.0")',
    file: 'AppDelegate.swift',
    code: (dsn) => `SentrySDK.start { options in\n    options.dsn = "${dsn}"\n    options.tracesSampleRate = ${TRACES_SAMPLE_RATE}\n}`,
  },
  OTHER,
]

export const platformOf = (id: string | null | undefined) => PLATFORMS.find((platform) => platform.id === id)
// A platform's name on screen. The SDKs' names are the same in every language; "Other" is not.
export const platformLabel = (platform: Platform) => (platform.id === OTHER.id ? messages().settings.setup.other : platform.name)
export const platformName = (id: string | null | undefined) => {
  const platform = platformOf(id)
  return platform ? platformLabel(platform) : (id ?? messages().settings.project.noPlatform)
}
// Stands in for the DSN until the project exists.
export const DSN_PLACEHOLDER = 'https://<key>@<this-server>/<project-id>'
export const OTHER_PLATFORM = OTHER.id
// The backend keeps no platform for "Other"; these map between what it stores and the platform shown.
export const shownPlatform = (stored: string | null | undefined) => stored ?? OTHER_PLATFORM
export const storedPlatform = (id: string) => (id === OTHER_PLATFORM ? null : id)
export const PLATFORM_GROUPS = Object.values(PlatformGroup)
