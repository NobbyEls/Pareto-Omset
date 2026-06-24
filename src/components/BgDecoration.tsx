/**
 * Three blurred floating orbs (indigo / pink / emerald) that drift slowly
 * behind every page. Pure decoration — never receives pointer events.
 */
export function BgDecoration() {
  return (
    <div className="bg-decoration" aria-hidden>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}
