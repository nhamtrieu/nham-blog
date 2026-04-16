import styles from "@/app/page.module.css";

type HomeFoundationProps = {
  checklist: readonly string[];
  directories: ReadonlyArray<{
    name: string;
    description: string;
  }>;
};

export function HomeFoundation({ checklist, directories }: HomeFoundationProps) {
  return (
    <section className={styles.foundation}>
      <article className={styles.panel}>
        <h2>Current milestone</h2>
        <p>The project has a clean foundation and a predictable structure for upcoming tasks.</p>
        <ul className={styles.list}>
          {checklist.map((item) => (
            <li key={item} className={styles.listItem}>
              <strong>{item}</strong>
            </li>
          ))}
        </ul>
      </article>

      <article className={styles.panel}>
        <h2>Project structure</h2>
        <p>
          These directories are reserved now so later tasks can slot in without reshuffling code.
        </p>
        <ul className={styles.list}>
          {directories.map((directory) => (
            <li key={directory.name} className={styles.listItem}>
              <strong>{directory.name}</strong>
              <span>{directory.description}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
