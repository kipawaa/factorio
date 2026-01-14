const CONFIG = {
    nodeRadius: 12,
    levelSpacing: 200, // Horizontal distance between levels
    colors: { raw: "#ff9800", crafted: "#2196f3", link: "#444" }
};

const svg = d3.select("#viz");
const container = svg.append("g");

// Zoom remains the same
svg.call(d3.zoom().on("zoom", (e) => container.attr("transform", e.transform)));

d3.json("recipes.json").then(data => {
    const nodes = data;
    const links = [];
    const nodeMap = new Map(nodes.map(d => [d.id, d]));

    // 1. Calculate Levels (Depth)
    // Simple iterative approach to find the "rank" of each item
    nodes.forEach(d => d.level = 0); 
    
    let changed = true;
    while (changed) {
        changed = false;
        nodes.forEach(node => {
            if (node.recipe && node.recipe.ingredients) {
                node.recipe.ingredients.forEach(ing => {
                    const parent = nodeMap.get(ing.id);
                    if (parent && node.level <= parent.level) {
                        node.level = parent.level + 1;
                        changed = true;
                    }
                });
            }
        });
    }

    // 2. Build Links
    nodes.forEach(d => {
        if (d.recipe?.ingredients) {
            d.recipe.ingredients.forEach(ing => {
                if (nodeMap.has(ing.id)) links.push({ source: ing.id, target: d.id });
            });
        }
    });

    // 3. Structured Simulation
    const simulation = d3.forceSimulation(nodes)
        // Force nodes to stay near their calculated Level X-coordinate
        .force("x", d3.forceX(d => d.level * CONFIG.levelSpacing).strength(1))
        // Spread nodes out vertically
        .force("y", d3.forceY(window.innerHeight / 2).strength(0.05))
        .force("link", d3.forceLink(links).id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("collision", d3.forceCollide().radius(30));

    // 4. Rendering (Links and Nodes)
    const link = container.append("g")
        .selectAll("path") // Use paths for potential curves later
        .data(links)
        .join("line")
        .attr("class", "link")
        .attr("stroke", CONFIG.colors.link)
        .attr("marker-end", "url(#arrowhead)");

    const node = container.append("g")
        .selectAll(".node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.level * CONFIG.levelSpacing}, ${window.innerHeight/2})`);

    node.append("circle")
        .attr("r", CONFIG.nodeRadius)
        .attr("fill", d => d.level === 0 ? CONFIG.colors.raw : CONFIG.colors.crafted);

    node.append("text")
        .attr("dx", 15)
        .attr("dy", ".35em")
        .text(d => d.name)
        .style("fill", "white");

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
});
