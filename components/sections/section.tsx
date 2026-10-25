import React from "react";

interface SectionProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Standard Section container component.
 *
 * Implements the noticeboard box-grid pattern: thin 1px border lines
 * that tile seamlessly with sibling sections to create a unified ruled frame.
 */
const Section = ({ children, className = "", id }: SectionProps) => {
  return (
    <div id={id} className={`section-box ${className}`.trim()}>
      {children}
    </div>
  );
};

export default Section;
