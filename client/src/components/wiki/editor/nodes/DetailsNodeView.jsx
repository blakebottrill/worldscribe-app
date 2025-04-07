import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import './detailsNodeView.css'; // We'll add some basic CSS

const DetailsNodeView = ({ node, updateAttributes, editor }) => {
  const { open } = node.attrs;

  const handleSummaryClick = () => {
    updateAttributes({
      open: !open,
    });
  };

  return (
    <NodeViewWrapper as="details" data-details-node open={open || undefined}>
      {/*
        NodeViewContent renders the node's actual content based on the schema.
        We need separate NodeViewContent tags for the summary and the details content.
        Tiptap should render the correct child node into the correct contentDOM based on its type.
      */}
      <NodeViewContent
        as="summary"
        data-summary-content
        onClick={handleSummaryClick} // Toggle open state on click
        // Tiptap will render the summaryNode's content here
      />
      <NodeViewContent
        as="div" // Render the content wrapper as a div
        data-details-content
        className={open ? 'details-content open' : 'details-content'}
        // Tiptap will render the detailsContentNode's content here
      />
    </NodeViewWrapper>
  );
};

export default DetailsNodeView;
