# Factorio crafting graph
A [d3.js force graph](https://d3js.org/d3-force) of the crafting tree in factorio, to find the perfect factory layout. 

- Nodes point from ingredient to product.
- Root items (uncraftables) are highlighted in orange.
- Leaf items (non-ingredients, end-products) are highlighted in green.
- Click and hold a node to view its crafting subtree, back to raw materials!
- Right click and hold a node to view all of the products made from it!
- Pan around, zoom and drag nodes restart the simulation and find a more stable configuration.
- Each node is a link to the factorio wiki page, double click for easy access to more details about each item.
- Use spacebar to pause/unpause the simulation, allowing full control over node positions to perfectly design your layout!
- Use the toggle in the help menu to enable snap-to-grid for perfectly straight, organized planning.
