// THROWAWAY PROTOTYPE. A short platform list with install and init snippets; the real build takes the stock list.
export type Platform = { id: string; name: string; group: string; install: string; file: string; code: (dsn: string) => string }

const js = (pkg: string, extra = '') => (dsn: string) =>
  `import * as Sentry from "${pkg}";\n\nSentry.init({\n  dsn: "${dsn}",${extra}\n  tracesSampleRate: 0.01,\n});`

const py = (integration = '') => (dsn: string) =>
  `import sentry_sdk\n\nsentry_sdk.init(\n    dsn="${dsn}",${integration}\n    traces_sample_rate=0.01,\n)`

export const PLATFORMS: Platform[] = [
  { id: 'javascript', name: 'Browser JavaScript', group: 'Browser', install: 'bun add @sentry/browser', file: 'main.js', code: js('@sentry/browser') },
  { id: 'javascript-react', name: 'React', group: 'Browser', install: 'bun add @sentry/react', file: 'src/main.tsx', code: js('@sentry/react') },
  { id: 'javascript-nextjs', name: 'Next.js', group: 'Browser', install: 'bun add @sentry/nextjs', file: 'instrumentation-client.ts', code: js('@sentry/nextjs') },
  { id: 'javascript-vue', name: 'Vue', group: 'Browser', install: 'bun add @sentry/vue', file: 'src/main.ts', code: js('@sentry/vue', '\n  app,') },
  { id: 'javascript-angular', name: 'Angular', group: 'Browser', install: 'bun add @sentry/angular', file: 'src/main.ts', code: js('@sentry/angular') },
  { id: 'javascript-svelte', name: 'Svelte', group: 'Browser', install: 'bun add @sentry/svelte', file: 'src/main.ts', code: js('@sentry/svelte') },
  { id: 'node', name: 'Node.js', group: 'Server', install: 'bun add @sentry/node', file: 'instrument.js', code: js('@sentry/node') },
  { id: 'node-express', name: 'Express', group: 'Server', install: 'bun add @sentry/node', file: 'instrument.js', code: js('@sentry/node') },
  { id: 'python', name: 'Python', group: 'Server', install: 'pip install sentry-sdk', file: 'main.py', code: py() },
  { id: 'python-django', name: 'Django', group: 'Server', install: 'pip install "sentry-sdk[django]"', file: 'settings.py', code: py('\n    send_default_pii=False,') },
  { id: 'python-flask', name: 'Flask', group: 'Server', install: 'pip install "sentry-sdk[flask]"', file: 'app.py', code: py() },
  { id: 'python-fastapi', name: 'FastAPI', group: 'Server', install: 'pip install "sentry-sdk[fastapi]"', file: 'main.py', code: py() },
  {
    id: 'go',
    name: 'Go',
    group: 'Server',
    install: 'go get github.com/getsentry/sentry-go',
    file: 'main.go',
    code: (dsn) => `err := sentry.Init(sentry.ClientOptions{\n\tDsn:              "${dsn}",\n\tTracesSampleRate: 0.01,\n})\nif err != nil {\n\tlog.Fatalf("sentry.Init: %s", err)\n}\ndefer sentry.Flush(2 * time.Second)`,
  },
  {
    id: 'ruby-rails',
    name: 'Rails',
    group: 'Server',
    install: 'bundle add sentry-ruby sentry-rails',
    file: 'config/initializers/sentry.rb',
    code: (dsn) => `Sentry.init do |config|\n  config.dsn = "${dsn}"\n  config.traces_sample_rate = 0.01\nend`,
  },
  {
    id: 'php-laravel',
    name: 'Laravel',
    group: 'Server',
    install: 'composer require sentry/sentry-laravel',
    file: '.env',
    code: (dsn) => `SENTRY_LARAVEL_DSN=${dsn}\nSENTRY_TRACES_SAMPLE_RATE=0.01`,
  },
  {
    id: 'java-spring-boot',
    name: 'Spring Boot',
    group: 'Server',
    install: 'implementation("io.sentry:sentry-spring-boot-starter-jakarta:8.0.0")',
    file: 'application.properties',
    code: (dsn) => `sentry.dsn=${dsn}\nsentry.traces-sample-rate=0.01`,
  },
  {
    id: 'csharp-aspnetcore',
    name: 'ASP.NET Core',
    group: 'Server',
    install: 'dotnet add package Sentry.AspNetCore',
    file: 'Program.cs',
    code: (dsn) => `builder.WebHost.UseSentry(options =>\n{\n    options.Dsn = "${dsn}";\n    options.TracesSampleRate = 0.01;\n});`,
  },
  {
    id: 'rust',
    name: 'Rust',
    group: 'Server',
    install: 'cargo add sentry',
    file: 'src/main.rs',
    code: (dsn) => `let _guard = sentry::init(("${dsn}", sentry::ClientOptions {\n    release: sentry::release_name!(),\n    ..Default::default()\n}));`,
  },
  {
    id: 'elixir',
    name: 'Elixir',
    group: 'Server',
    install: '{:sentry, "~> 11.0"}',
    file: 'config/config.exs',
    code: (dsn) => `config :sentry,\n  dsn: "${dsn}",\n  environment_name: Mix.env()`,
  },
  { id: 'react-native', name: 'React Native', group: 'Mobile', install: 'bun add @sentry/react-native', file: 'App.tsx', code: js('@sentry/react-native') },
  {
    id: 'flutter',
    name: 'Flutter',
    group: 'Mobile',
    install: 'flutter pub add sentry_flutter',
    file: 'lib/main.dart',
    code: (dsn) => `await SentryFlutter.init(\n  (options) => options.dsn = '${dsn}',\n  appRunner: () => runApp(const MyApp()),\n);`,
  },
  {
    id: 'android',
    name: 'Android',
    group: 'Mobile',
    install: 'implementation("io.sentry:sentry-android:8.0.0")',
    file: 'AndroidManifest.xml',
    code: (dsn) => `<meta-data android:name="io.sentry.dsn"\n    android:value="${dsn}" />`,
  },
  {
    id: 'apple-ios',
    name: 'iOS',
    group: 'Mobile',
    install: '.package(url: "https://github.com/getsentry/sentry-cocoa", from: "9.0.0")',
    file: 'AppDelegate.swift',
    code: (dsn) => `SentrySDK.start { options in\n    options.dsn = "${dsn}"\n    options.tracesSampleRate = 0.01\n}`,
  },
  { id: 'other', name: 'Other', group: 'Other', install: '', file: 'DSN', code: (dsn) => dsn },
]

export const platformOf = (id: string | null | undefined) => PLATFORMS.find((platform) => platform.id === id)
export const platformName = (id: string | null | undefined) => platformOf(id)?.name ?? id ?? 'No platform'
export const DSN_PLACEHOLDER = 'https://<key>@errors.demo-co.example/<id>'
