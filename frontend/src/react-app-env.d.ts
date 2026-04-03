/// <reference types="react-scripts" />

import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "spoiler-span": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
