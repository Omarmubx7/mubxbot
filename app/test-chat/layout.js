import React from "react";
import PropTypes from "prop-types";

export const metadata = {
  title: "Test Chat (internal)",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestChatLayout({ children }) {
  return <>{children}</>;
}

TestChatLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
