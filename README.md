# Factorio crafting graph
A [d3.js force graph](https://d3js.org/d3-force) of the crafting tree in factorio, to find the perfect factory layout. 

- Nodes point from ingredient to product.
- Root items (uncraftables) are highlighted in orange.
- Leaf items (non-ingredients, end-products) are highlighted in green.
- Click and hold a node to view its crafting subtree, back to raw materials!
- Pan around, zoom and drag nodes restart the simulation and find a more stable configuration.
- Each node is a link to the factorio wiki page, double click for easy access to more details about each item.
