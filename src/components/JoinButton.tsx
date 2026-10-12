"use client";

/**
 * THE SECOND "SAVE MY SPOT": back up to the one form, with the cursor already
 * in the email field. Without script it is a plain link to #join; with
 * reduced motion it jumps instead of gliding. Someone already on the list
 * lands on their pass, which is what is at #join for them.
 */
export function JoinButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a
      href="#join"
      className={className}
      onClick={(e) => {
        const target = document.getElementById("join");
        if (!target) return;
        e.preventDefault();
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
        document.getElementById("spot-email")?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
