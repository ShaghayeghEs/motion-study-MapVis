// Custom script
// handles the data loading, rendering, and interactivity for the map visualization. 

// Select the SVG element and set up initial variables
var svg = d3.select("svg"),
  width = +svg.attr("width"),
  height = +svg.attr("height"),
  active = d3.select(null), // Variable to keep track of active selection
  countyGeo, // Variable to store county geographic data
  covidData = [], // Array to store COVID-19 data
  endDate, // Variable to store the end date of COVID-19 data
  g, // Group element for rendering
  path, // Path generator
  formatNumber, // Function for formatting numbers
  zoom, // Zoom behavior
  radius, // Scale for circle radius
  promises, // Array to store promises for data loading
  selectedDataType = "cases", // Variable to store the selected data type, initialized to "cases"
  selectedMapType = "bubble"; // [Added] Variable to store the selected map type, initialized to "bubble"

// Add a background rectangle to capture click events for resetting zoom
svg.on("click", stopped, true);

svg
  .append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height)
  .on("click", reset);

g = svg.append("g"); // Append a group element for rendering

path = d3.geoPath(); // Initialize path generator

formatNumber = d3.format(",.0f"); // Initialize number formatting function

// Initialize zoom behavior with scale extent and event listener
zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);

// Initialize scale for circle radius
radius = d3.scaleSqrt().domain([0, 1000]).range([0, 8]);

svg.call(zoom); // Apply zoom behavior to SVG element
// Array of promises for loading data
promises = [
  d3.json("us-data.json"),
  d3.csv("covid-19-data/us-counties.csv", function (d) {
    covidData.push(d); // Parse CSV data and push into covidData array
  }),
];

Promise.all(promises).then(function(results) { // [Modified]
  console.log('Data loaded:', results); // [Added] Log the loaded data
  countyGeo = topojson.feature(results[0], results[0].objects.counties).features;
  
  if (covidData.length > 0) { // [Added] Check if covidData is not empty
    endDate = new Date(covidData[covidData.length - 1].date);
  } else {
    console.error('covidData is empty.'); // [Added] Error message if covidData is empty
    return;
  }

  renderStates(results[0]);
  renderMap(); // [Modified]
  renderLegend();
}).catch(function(error) { // [Added] Catch any errors during data loading
  console.error('Error loading data:', error);
});


// // After all promises are resolved, execute ready function
// Promise.all(promises).then(ready);

// function ready([us]) {
//   countyGeo = topojson.feature(us, us.objects.counties).features;
//   endDate = new Date(covidData[covidData.length - 1].date);

//   renderStates(us);
//   renderBubbles(us, getFormattedDate(endDate));
//   renderLegend();
// }

document.getElementById("data-type").addEventListener("change", function () {
  selectedDataType = this.value; // Update selectedDataType variable
  renderMap(); // [Modified] Re-render map based on new data type
});


// // Function to handle change in data type selection
// document.getElementById("data-type").addEventListener("change", function () {
//   selectedDataType = this.value; // Update selectedDataType variable
//   renderBubbles(); // Re-render bubbles based on new data type
// });

document.getElementById("map-type").addEventListener("change", function () {
  selectedMapType = this.value; // Update selectedMapType variable
  renderMap(); // Re-render map based on new map type
});

function renderMap() { // [Added]
  // Clear existing visualization
  d3.selectAll(".bubble").remove();
  d3.selectAll(".choropleth").remove();

  if (selectedMapType === "bubble") {
    renderBubbles(); // Render bubble map
  } else if (selectedMapType === "choropleth") {
    renderChoropleth(); // Render choropleth map
  }
}

// Function to render choropleth map
function renderChoropleth() { // [Added]
  // Logic to render choropleth map based on selected data type (cases or deaths)
  // This can include color scales, updating county fill based on data, etc.
}

// Function to render bubbles on the map
function renderBubbles() {
  // Initialize covidCases and covidDeaths properties for each county
  countyGeo.forEach(function (county) {
    county.properties.covidCases = 0;
    county.properties.covidDeaths = 0; // Initialize covidDeaths property
  });
  // Update covidCases and covidDeaths properties based on selected data type
  covidData.forEach(function (item) {
    if (item.date === getFormattedDate(endDate)) {
      countyGeo.forEach(function (county) {
        if (item.fips === county.id) {
          if (selectedDataType === "cases") {
            county.properties.covidCases = item.cases;
          } else if (selectedDataType === "deaths") {
            county.properties.covidDeaths = item.deaths;
          }
          county.properties.county = item.county;
          county.properties.state = item.state;
        }
      });
    }
  });
  // Remove existing bubbles
  d3.selectAll(".bubble").remove();
  // Render new bubbles based on updated data
  g.append("g")
    .attr("class", "bubble")
    .selectAll("circle")
    .data(
      countyGeo.sort(function (a, b) {
        // Sorting data based on selected data type (cases or deaths)
        if (selectedDataType === "cases") {
          return b.properties.covidCases - a.properties.covidCases;
        } else if (selectedDataType === "deaths") {
          return b.properties.covidDeaths - a.properties.covidDeaths;
        }
      })
    )
    .enter()
    .append("circle")
    .attr("transform", function (d) {
      // Translating circles to the centroid of each county
      return "translate(" + path.centroid(d) + ")";
    })
    .attr("r", function (d) {
      // Setting radius of circles based on selected data type
      if (selectedDataType === "cases") {
        return radius(d.properties.covidCases || 0);
      } else if (selectedDataType === "deaths") {
        return radius(d.properties.covidDeaths || 0);
      }
    })
    .append("title")
    .text(function (d) {
      // Providing tooltip text based on selected data type
      if (selectedDataType === "cases" && d.properties.covidCases) {
        return (
          d.properties.county +
          ", " +
          d.properties.state +
          "\nCases: " +
          formatNumber(d.properties.covidCases)
        );
      } else if (selectedDataType === "deaths" && d.properties.covidDeaths) {
        return (
          d.properties.county +
          ", " +
          d.properties.state +
          "\nDeaths: " +
          formatNumber(d.properties.covidDeaths)
        );
      }
    });
}
// Function to render legend
function renderLegend() {
  var sampleSizes = [100, 1000, 10000],
    legend;
  // Appending legend group to the SVG
  legend = g
    .append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (width - 50) + "," + (height - 20) + ")")
    .selectAll("g")
    .data(sampleSizes)
    .enter()
    .append("g");
  // Appending circles to the legend group
  legend
    .append("circle")
    .attr("cy", function (d) {
      return -radius(d);
    })
    .attr("r", radius);
  // Appending text to the legend group
  legend
    .append("text")
    .attr("y", function (d) {
      return -2 * radius(d);
    })
    .attr("dy", "1.3em")
    .text(d3.format(".1s"));
}
// Function to render states
function renderStates(us) {
  var stateGeo;
  // Appending paths for states to the SVG
  g.selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "feature")
    .on("click", clicked);
  // Creating mesh for state borders
  stateGeo = topojson.mesh(us, us.objects.states, function (a, b) {
    return a !== b;
  });
  // Appending state borders to the SVG
  g.append("path")
    .datum(stateGeo)
    .attr("class", "border border--state mesh")
    .attr("d", path);
}
// Function to format date
function getFormattedDate(d) {
  var dd = d.getUTCDate(),
    mm = d.getUTCMonth() + 1,
    yyyy = d.getFullYear();

  if (dd < 10) {
    dd = "0" + dd;
  }

  if (mm < 10) {
    mm = "0" + mm;
  }

  return yyyy + "-" + mm + "-" + dd;
}
// Function to handle click event on state
function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  d3.event.stopPropagation();

  var bounds = path.bounds(d),
    dx = bounds[1][0] - bounds[0][0],
    dy = bounds[1][1] - bounds[0][1],
    x = (bounds[0][0] + bounds[1][0]) / 2,
    y = (bounds[0][1] + bounds[1][1]) / 2,
    scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
    translate = [width / 2 - scale * x, height / 2 - scale * y];
  // Applying zoom transition to the SVG
  svg
    .transition()
    .duration(750)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
}
// Function to reset zoom
function reset() {
  active.classed("active", false);
  active = d3.select(null);
  // Applying zoom reset transition to the SVG
  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
}
// Function to handle zoom event
function zoomed() {
  g.style("stroke-width", 1.5 / d3.event.transform.k + "px");
  g.attr("transform", d3.event.transform);
}
// Function to stop event propagation
function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
}
