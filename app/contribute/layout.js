import React from "react";
import PropTypes from "prop-types";

export const metadata = {
  title: "Contribute",
  description:
    "Help improve MUBXBot — contribute instructor office hours, office locations, and contact details for the HTU faculty directory.",
  alternates: {
    canonical: "/contribute",
  },
  openGraph: {
    title: "Contribute to MUBXBot",
    description:
      "Help improve MUBXBot by contributing instructor office hours, office locations, and contact details.",
    url: "https://bot.mubx.dev/contribute",
    type: "website",
  },
};

export default function ContributeLayout({ children }) {
  return <>{children}</>;
}

ContributeLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
