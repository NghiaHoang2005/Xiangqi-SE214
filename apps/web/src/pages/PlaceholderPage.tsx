interface Props {
  title: string;
  /** What the screen will show, from SRS 9.1. */
  description: string;
  /** Jira story that builds the real screen. */
  story: string;
}

/** Stand-in for a screen that a later story builds. Shows its purpose and the story key. */
export function PlaceholderPage({ title, description, story }: Props) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="muted">Màn hình đang được xây dựng ({story}).</p>
    </section>
  );
}
