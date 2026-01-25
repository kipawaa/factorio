/**
 * Factorio Recipe Graph Logic
 */

const CONFIG = {
  nodeRadius: 10,
  forceStrength: -4000,
  linkDistance: 150,
  linkStrength: 0.1,
  gridSize: 50,
};

let simulationIsRunning = true;

let snapToGrid = false;

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
svg.call(
  zoom.transform,
  d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(initialScale)
    .translate(-width / 2, -height / 2),
);
svg.call(zoom);

const defs = container.append("defs"); // Select existing defs

// --- Define Arrowheads ---
defs
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

// --- Define Grid ---
const pattern = defs
  .append("pattern")
  .attr("id", "grid-pattern")
  .attr("width", CONFIG.gridSize)
  .attr("height", CONFIG.gridSize)
  .attr("patternUnits", "userSpaceOnUse")
  .append("path")
  .attr("d", `M ${CONFIG.gridSize} 0 L 0 0 0 ${CONFIG.gridSize}`)
  .attr("fill", "none")
  .attr("stroke", "#555")
  .attr("stroke-width", "1");

const gridBackground = container
  .insert("rect", ":first-child") // Insert behind everything
  .attr("width", width * 10) // Make it huge to cover panning
  .attr("height", height * 10)
  .attr("x", -width * 5)
  .attr("y", -height * 5)
  .attr("fill", "url(#grid-pattern)")
    .attr("pointer-events", "none")
  .attr("opacity", 0);

// --- Load and Render ---
d3.json("recipes.json")
  .then((data) => {
    const nodes = data;
    const links = [];
    const nodeMap = new Map(nodes.map((d) => [d.id, d]));

    const usedAsIngredient = new Set();
    nodes.forEach((item) => {
      item.recipe?.ingredients?.forEach((ing) => usedAsIngredient.add(ing.id));
    });

    nodes.forEach((d) => {
      if (d.recipe && d.recipe.ingredients) {
        d.recipe.ingredients.forEach((ingredient) => {
          if (nodeMap.has(ingredient.id)) {
            links.push({ source: ingredient.id, target: d.id });
          }
        });
      }
    });

    function traverseToIngredient(root, callback) {
      if (!root) return;

      callback(d3.select(`#${root.id}`));

      if (root.recipe && root.recipe.ingredients) {
        root.recipe.ingredients.forEach((ingredient) => {
          const node = nodeMap.get(ingredient.id);
          if (node) {
            // update links
            callback(d3.select(`#link-${ingredient.id}-${root.id}`));

            // update nodes
            traverseToIngredient(node, callback);
          }
        });
      }
    }

    function traverseToProduct(root, callback) {
      if (!root) return;

      callback(d3.select(`#${root.id}`));

      nodes
        .filter(
          (node) =>
            node.recipe &&
            node.recipe.ingredients &&
            node.recipe.ingredients.some(
              (ingredient) => ingredient.id === root.id,
            ),
        )
        .forEach((consumer) => {
          // update links
          callback(d3.select(`#link-${root.id}-${consumer.id}`));

          // update node
          traverseToProduct(consumer, callback);
        });
    }

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(CONFIG.linkDistance),
      )
      .force("charge", d3.forceManyBody().strength(CONFIG.forceStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(CONFIG.nodeRadius * 2));

    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link")
      .attr("id", (link) => `link-${link.source.id}-${link.target.id}`)
      .attr("marker-end", "url(#arrowhead)");

    const node = container
      .append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("id", (d) => d.id)
      .attr("class", (d) => {
        const isRaw = d.recipe?.ingredients?.length === 0;
        const isLeaf = !usedAsIngredient.has(d.id);

        let type = "ingredient";
        if (isLeaf) type = "leaf";
        else if (isRaw) type = "raw";

        return `node ${type}`;
      })
      .on("contextmenu", (e) => e.preventDefault())
      .call(drag(simulation));

    node
      .append("circle")
      .attr("r", CONFIG.nodeRadius)
      .on("dblclick", (e, d) => {
        if (d.wiki_link) window.open(d.wiki_link, "_blank");
      });

    node
      .append("text")
      .attr("dx", 15)
      .attr("dy", ".35em")
      .text((d) => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active && simulationIsRunning)
          simulation.alphaTarget(0.3).restart();

        // get pointer position from d3
        const [mx, my] = d3.pointer(event, container.node());

        event.subject.fx = mx;
        event.subject.fy = my;

        if (event.sourceEvent.buttons === 1) {
          traverseToIngredient(event.subject, (selection) => {
            selection.classed("highlight", true);
          });
        } else {
          traverseToProduct(event.subject, (selection) => {
            selection.classed("highlight", true);
          });
        }
      }

      function dragged(event) {
        // get pointer position from d3
        let [mx, my] = d3.pointer(event, container.node());

        event.subject.fx = mx;
        event.subject.fy = my;

        if (!simulationIsRunning) {
          if (snapToGrid) {
            mx = Math.round(mx / CONFIG.gridSize) * CONFIG.gridSize;
            my = Math.round(my / CONFIG.gridSize) * CONFIG.gridSize;
          }

          d3.select(this).attr("transform", `translate(${mx}, ${my})`);
          link
            .filter(
              (l) =>
                l.source.id === event.subject.id ||
                l.target.id === event.subject.id,
            )
            .each(function (l) {
              const isSource = l.source.id === event.subject.id;
              d3.select(this)
                .attr(isSource ? "x1" : "x2", mx)
                .attr(isSource ? "y1" : "y2", my);
            });
        }
      }

      function dragended(event) {
        if (!event.active && simulationIsRunning) simulation.alphaTarget(0);

        if (simulationIsRunning) {
          event.subject.fx = null;
          event.subject.fy = null;
        }
        container.selectAll(".node, .link").classed("highlight", false);
      }

      return d3
        .drag()
        .filter((e) => e.buttons === 1 || e.buttons === 2)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    const helpMenu = document.getElementById("help-menu");
    const helpToggle = document.getElementById("help-toggle");

    if (helpToggle) {
      helpToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        helpMenu.classList.toggle("open");
      });
    }

    window.addEventListener("keydown", (event) => {
      // Check if the pressed key is the Spacebar
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault(); // Prevent page scrolling

        if (simulationIsRunning) {
          simulation.stop();
          simulationIsRunning = false;
          if (snapToGrid) {
            gridBackground.attr("opacity", 1);
          }
        } else {
          simulation.alpha(1).restart();
          simulationIsRunning = true;
          gridBackground.attr("opacity", 0);
        }
      }
    });

    const snapToggle = document.getElementById("grid-snap-toggle");
    snapToggle.addEventListener("change", (e) => {
      snapToGrid = e.target.checked;
      if (snapToGrid && !simulationIsRunning) {
        gridBackground.attr("opacity", 1);
      } else {
        gridBackground.attr("opacity", 0);
      }
    });
  })
  .catch((err) => console.error("Data loading failed:", err));
