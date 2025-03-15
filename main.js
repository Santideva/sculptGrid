import { createAdaptiveGridModule } from './adaptiveGrid.js';

// Set up the canvas and its rendering context
const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

// Create an instance of the adaptive grid module with custom parameters
const adaptiveGrid = createAdaptiveGridModule({
  ctx,
  parameters: {
    grid: { 
      size: 30, 
      showGrid: true, 
      color: '#444444',
      snapToGrid: true 
    },
    transformations: { 
      blendMode: 'smooth',
      defaultRadius: 150,
      maxActiveDomains: 5,
      regularizationFactor: 0.001
    }
  }
});

// Initialize the grid module (updates viewport dimensions and renders the initial grid)
adaptiveGrid.initialize();

// Create an initial transformation domain using the updated factory method.
// Note: The createTransformationDomain method now leverages the localShapeDeformation module's factory.
const domain1 = adaptiveGrid.createTransformationDomain(
  { x: 200, y: 200 }, // center of the domain
  100,               // radius of the domain
  adaptiveGrid.DOMAIN_TYPES.SPHERICAL // domain type
);

// Example: Re-render the grid after a short delay (e.g., to allow observation of the initial state)
setTimeout(() => {
  adaptiveGrid.renderGrid();
}, 1000);

// Add an event listener to create new transformation domains on canvas click
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  // Calculate the click position relative to the canvas
  const clickPoint = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  
  // Optionally, snap the click point to the grid
  const snappedPoint = adaptiveGrid.snapToGrid(clickPoint);
  
  // Create a new domain at the snapped point; here we use a cylindrical domain for variety
  adaptiveGrid.createTransformationDomain(
    snappedPoint, // center
    80, // radius
    adaptiveGrid.DOMAIN_TYPES.CYLINDRICAL
  );
  
  // Update the grid rendering to reflect the new transformation domain
  adaptiveGrid.renderGrid();
});

// Example: Remove a domain after 5 seconds to demonstrate domain management
setTimeout(() => {
  // Remove the first created domain using its id
  adaptiveGrid.removeTransformationDomain(domain1.id);
  
  // Re-render the grid after removal
  adaptiveGrid.renderGrid();
}, 5000);

// Optionally, update viewport dimensions on window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  adaptiveGrid.updateViewportDimensions(canvas.width, canvas.height);
  adaptiveGrid.renderGrid();
});
