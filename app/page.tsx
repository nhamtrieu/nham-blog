import { HomeFoundation } from "@/src/components/home/home-foundation";
import { foundationChecklist, plannedDirectories, quickLinks, siteConfig } from "@/src/config/site";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>Foundation Task T003</span>
          <h1>{siteConfig.heading}</h1>
          <p>{siteConfig.description}</p>
        </div>
        <div className={styles.ctas}>
          {quickLinks.map((link) => (
            <a
              key={link.href}
              className={link.variant === "primary" ? styles.primary : styles.secondary}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
        <HomeFoundation checklist={foundationChecklist} directories={plannedDirectories} />
      </main>
    </div>
  );
}
