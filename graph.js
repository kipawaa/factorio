/**
* Factorio Recipe Graph Logic
*/

const CONFIG = {
    nodeRadius: 10,
    forceStrength: -4000, 
    linkDistance: 150,
    linkStrength: 0.1, 
    
    colors: {
        leaf: "#4CAF50",
        intermediate: "#2196f3",
        root: "#ff9800",
        raw: "#ff9800",
        link: "#555",
    },
};

const svg = d3.select("#viz");
const width = window.innerWidth;
const height = window.innerHeight;

const container = svg.append("g");

const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
        container.attr("transform", event.transform);
    });

const initialScale = 0.4;
svg.call(zoom.transform, d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(initialScale)
    .translate(-width / 2, -height / 2)
);
svg.call(zoom);

// --- Define Arrowheads ---
container
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("class", "link");

// --- Load and Render ---
d3.json("recipes.json")
    .then((data) => {
        const nodes = data;
        const links = [];
        const nodeMap = new Map(nodes.map((d) => [d.id, d]));

        const usedAsIngredient = new Set();
        nodes.forEach(item => {
            item.recipe?.ingredients?.forEach(ing => usedAsIngredient.add(ing.id));
        });

        function traverseToIngredient(rootNode, callback) {
            if (!rootNode) return;
            callback(rootNode); 
            if (rootNode.recipe && rootNode.recipe.ingredients) {
                rootNode.recipe.ingredients.forEach(ing => {
                    const fullNodeData = nodeMap.get(ing.id);
                    if (fullNodeData) traverseToIngredient(fullNodeData, callback);
                });
            }
        }

        nodes.forEach((d) => {
            if (d.recipe && d.recipe.ingredients) {
                d.recipe.ingredients.forEach((ingredient) => {
                    if (nodeMap.has(ingredient.id)) {
                        links.push({ source: ingredient.id, target: d.id });
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
            .attr("id", d => d.id) 
            .attr("class", d => {
                const isRaw = d.recipe?.ingredients?.length === 0;
                const isLeaf = !usedAsIngredient.has(d.id);

                let type = "ingredient";
                if (isLeaf) type = "leaf";
                else if (isRaw) type = "raw";

                return `node ${type}`; 
            })
            .call(drag(simulation));

            node.append("circle")
            .attr("r", CONFIG.nodeRadius)
            .on("click", (e, d) => {
                if (d.wiki_link) window.open(d.wiki_link, "_blank");
            });

        node.append("text")
            .attr("dx", 15)
            .attr("dy", ".35em")
            .text((d) => d.name);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
                traverseToIngredient(event.subject, d => {
                    d3.select(`#${d.id}`).classed("highlight", true);
                });
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
                traverseToIngredient(event.subject, d => {
                    d3.select(`#${d.id}`).classed("highlight", false);
                });
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
    })
    .catch((err) => console.error("Data loading failed:", err));
