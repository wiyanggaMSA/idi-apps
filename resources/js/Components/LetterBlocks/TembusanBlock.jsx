import React from "react";

export default function TembusanBlock({ block }) {
  return <div style={{ whiteSpace: "pre-wrap" }}>{block.content}</div>;
}
