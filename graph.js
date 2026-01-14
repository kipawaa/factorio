/**
 * Factorio Recipe Graph Logic
 */

const CONFIG = {
    nodeRadius: 10,
    forceStrength: -400,
    linkDistance: 100,
    colors: {
        raw: "#ff9800",     // Orange for base materials
        crafted: "#2196f3", // Blue for intermediate/final products
        link: "#555"
    }
};

const svg = d3.select("#viz");
const width = window.innerWidth;
const height = window.innerHeight;

// --- Setup Zoom & Container ---
const container = svg.append("g");

const zoom = d3.zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
        container.attr("transform", event.transform);
    });

svg.call(zoom);

// --- Define Arrowheads ---
container.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20) 
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', CONFIG.colors.link);

// --- Load and Render ---
d3.json("recipes.json").then(data => {
    const nodes = data;
    const links = [];
    const nodeMap = new Set(nodes.map(d => d.id));

    // Process links
    nodes.forEach(d => {
        if (d.recipe && d.recipe.ingredients) {
            d.recipe.ingredients.forEach(ing => {
                if (nodeMap.has(ing.id)) {
                    links.push({ source: ing.id, target: d.id });
                }
            });
        }
    });

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(CONFIG.linkDistance))
        .force("charge", d3.forceManyBody().strength(CONFIG.forceStrength))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(CONFIG.nodeRadius * 2));

    const link = container.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("class", "link")
        .attr("marker-end", "url(#arrowhead)");

    const node = container.append("g")
        .selectAll(".node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .call(drag(simulation));

    node.append("circle")
        .attr("r", CONFIG.nodeRadius)
        .attr("fill", d => d.recipe.ingredients.length === 0 ? CONFIG.colors.raw : CONFIG.colors.crafted)
        .on("click", (e, d) => {
            if (d.wiki_link) window.open(d.wiki_link, "_blank");
        });

    node.append("text")
        .attr("dx", 15)
        .attr("dy", ".35em")
        .text(d => d.name);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
}).catch(err => console.error("Data loading failed:", err));

// --- Helper Functions ---
function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}
