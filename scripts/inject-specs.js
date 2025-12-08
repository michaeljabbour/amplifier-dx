#!/usr/bin/env node

const fs = require('fs');

const INDEX_FILE = 'index.html';
const GENERATED_FILE = 'generated-specs.html';

// Markers for injection points
const START_MARKER = '<!-- AUTO-GENERATED: External Specifications';
const END_MARKER = '<!-- END AUTO-GENERATED -->';

function main() {
  // Check if files exist
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`Error: ${INDEX_FILE} not found`);
    process.exit(1);
  }

  if (!fs.existsSync(GENERATED_FILE)) {
    console.error(`Error: ${GENERATED_FILE} not found. Run transform-specs.js first.`);
    process.exit(1);
  }

  // Read files
  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const generatedContent = fs.readFileSync(GENERATED_FILE, 'utf-8');

  let updatedContent;

  // Check if auto-generated content already exists
  if (indexContent.includes(START_MARKER)) {
    // Replace existing auto-generated content
    const startIndex = indexContent.indexOf(START_MARKER);
    const endIndex = indexContent.indexOf(END_MARKER) + END_MARKER.length;

    updatedContent =
      indexContent.slice(0, startIndex) +
      generatedContent.trim() +
      indexContent.slice(endIndex);

    console.log('Replaced existing auto-generated content');

  } else {
    // Find the contrib-specs tab closing div before Roadmap Tab
    const roadmapMarker = '<!-- Roadmap Tab -->';
    const roadmapIndex = indexContent.indexOf(roadmapMarker);

    if (roadmapIndex === -1) {
      console.error('Error: Could not find Roadmap Tab marker in index.html');
      process.exit(1);
    }

    // Find the </div> before Roadmap Tab (end of contrib-specs content)
    // We need to find the last </div> before the Roadmap marker
    const beforeRoadmap = indexContent.slice(0, roadmapIndex);
    const lastDivIndex = beforeRoadmap.lastIndexOf('</div>');

    if (lastDivIndex === -1) {
      console.error('Error: Could not find closing div before Roadmap Tab');
      process.exit(1);
    }

    // Insert generated content before the closing </div> of contrib-specs
    updatedContent =
      indexContent.slice(0, lastDivIndex) +
      '\n\n' + generatedContent.trim() + '\n      ' +
      indexContent.slice(lastDivIndex);

    console.log('Inserted new auto-generated content into contrib-specs section');
  }

  // Write updated content
  fs.writeFileSync(INDEX_FILE, updatedContent);
  console.log('Successfully updated index.html');
}

main();
