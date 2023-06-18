(function (d3, topojson) {
    'use strict';
  
    const svg = d3.select('#map');
  
    const projection = d3.geoNaturalEarth1();
    const pathGenerator = d3.geoPath().projection(projection);
  
    const g = svg.append('g');
  
    g.append('path')
      .attr('class', 'sphere')
      .attr('d', pathGenerator({ type: 'Sphere' }));
  
    svg.call(
      d3.zoom().on('zoom', (event) => {
        g.attr('transform', event.transform);
      })
    );
  
    Promise.all([
      d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
      d3.json('https://unpkg.com/world-atlas@1.1.4/world/50m.json')
    ]).then(([tsvData, topoJSONdata]) => {
      const countryName = tsvData.reduce((accumulator, d) => {
        accumulator[d.iso_n3] = d.name;
        return accumulator;
      }, {});
  
      const countries = topojson.feature(topoJSONdata, topoJSONdata.objects.countries);
      g.selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('class', 'country')
        .attr('d', pathGenerator)
        .append('title')
        .text((d) => countryName[d.id]);
  
      g.selectAll('path').on('click', (event, d) => {
        document.getElementById('tooltip').innerHTML = countryName[d.id];
        document.getElementById('cur_country').value = countryName[d.id];

        // Trigger change event for country-select
        const eventChange = new Event('change');
        document.getElementById('country-select').dispatchEvent(eventChange);
      });
  
      g.selectAll('path').on('mouseout', () => {
        document.getElementById('tooltip').innerHTML = '';
      });
    });
  })(d3, topojson);

var movableDiv = document.getElementById("tooltip");

document.addEventListener("mousemove", function (event) {
    var mouseX = event.clientX + 25;
    var mouseY = event.clientY;

    movableDiv.style.left = mouseX + "px";
    movableDiv.style.top = mouseY + "px";
});
  

//SECOND PART

// Read the results.csv file using D3.js
let mainData;
d3.dsv(',', 'data/results.csv').then(function(data) {
  mainData = data;
  processData(data);
});

// Get the confirm button element
const confirmBtn = document.getElementById("confirm-btn");

// Add event listener to the confirm button
confirmBtn.addEventListener("click", function () {
  processData(mainData);
});

// Function to process the data
function processData(data) {
  
    let minDate = d3.min(data.map(d => d.date)); // Update default min date
    let maxDate = d3.max(data.map(d => d.date)); // Update default max date
  
    // Create an event listener for the country select dropdown
    const select = d3.select("#country-select");
    select.on("change", function() {
        const selectedCountry = document.getElementById("cur_country").value;
        document.getElementById("country-select").textContent = selectedCountry;


        minDate = document.getElementById("min-date").value;
        maxDate = document.getElementById("max-date").value;

        // Filter the data for the selected country and date interval
        const filteredData = data.filter(
            d =>
                (d.home_team === selectedCountry || d.away_team === selectedCountry) &&
                d.date >= minDate &&
                d.date <= maxDate
        );

        //normalize
        const matchScoresForSelectedCountry = [];
        const matchScoresForOppositeCountry = [];
        filteredData.forEach(d => {
            if (d.home_team === selectedCountry) {
            matchScoresForSelectedCountry.push(parseInt(d.home_score));
            matchScoresForOppositeCountry.push(parseInt(d.away_score));
            } else {
            matchScoresForSelectedCountry.push(parseInt(d.away_score));
            matchScoresForOppositeCountry.push(parseInt(d.home_score));
            }
        });

        filteredData.forEach((d, i) => {
                d.home_score = matchScoresForSelectedCountry[i];
                d.away_score = matchScoresForOppositeCountry[i];
                if(d.home_team!==selectedCountry){
                    const temp = d.home_team;
                    d.home_team = d.away_team;
                    d.away_team = temp;
                }
            }
        );
        drawGraphs(filteredData);
    });
    // Trigger initial change event for default selected country
    const eventChange = new Event('change');
    select.node().dispatchEvent(eventChange);
}

  
// Function to draw the graphs
function drawGraphs(filteredData) {
    
    // Set up the chart dimensions and margins
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 1200 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    // Remove any existing chart
    d3.select("#chart-container").select("svg").remove();

    // Create the SVG container for the chart
    const svg = d3
        .select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);


    // Create the x and y scales
    const xScale = d3
        .scaleBand()
        .domain(d3.range(filteredData.length))
        .range([0, width])
        .padding(0.1);

    const barWidth = xScale.bandwidth();

    const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(filteredData.map(d => d.home_score))])
        .range([height / 2, 0]); // Half the height for selected country chart

    const yScaleOpposite = d3
        .scaleLinear()
        .domain([0, d3.max(filteredData.map(d => d.away_score))])
        .range([height, height / 2]); // Half the height for opposite country chart

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip2")
        .style("opacity", 0);

    // Create the bars for selected country
    const barsSelected = svg
        .selectAll(".bar-selected")
        .data(filteredData)
        .enter()
        .append("rect")
        .attr("class", "bar-selected")
        .attr("x", (d, i) => xScale(i))
        .attr("y", d => yScale(d.home_score))
        .attr("width", barWidth)
        .attr("height", d => height / 2 - yScale(d.home_score)) // Half the height for selected country chart
        .style("fill", "steelblue")
        .on("mouseover", function (event, d, i) {
            // Show the tooltip
            tooltip.style("opacity", 1);
        
            // Add outline to the hovered bar
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
      
            // Position the tooltip relative to the mouse pointer
            tooltip.style("left", event.pageX + 10 + "px");
            tooltip.style("top", event.pageY + 10 + "px");
      
            tooltip.html(`<strong>Score:</strong> ${d.home_score} <br>
              <strong>Date:</strong> ${d.date} <br>
              <strong>Home Team:</strong> ${d.home_team}`);
          })
          .on("mouseout", function () {
            // Hide the tooltip
            tooltip.style("opacity", 0);
        
            // Remove outline from the bar
            d3.select(this).attr("stroke", null);
          });

    // Create the bars for opposite country
    const barsOpposite = svg
        .selectAll(".bar-opposite")
        .data(filteredData)
        .enter()
        .append("rect")
        .attr("class", "bar-opposite")
        .attr("x", (d, i) => xScale(i))
        .attr("y", height / 2)
        .attr("width", barWidth)
        .attr("height", d => height - yScaleOpposite(d.away_score)) // Half the height for opposite country chart
        .style("fill", "orange")
        .on("mouseover", function (event, d, i) {
            // Show the tooltip
            tooltip.style("opacity", 1);

            // Add outline to the hovered bar
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
      
            // Position the tooltip relative to the mouse pointer
            tooltip.style("left", event.pageX + 10 + "px");
            tooltip.style("top", event.pageY + 10 + "px");
      
            // Update the tooltip content
            tooltip.html(`<strong>Score:</strong> ${d.away_score} <br>
                <strong>Date:</strong> ${d.date} <br>
                <strong>Home Team:</strong> ${d.away_team}`);
          })
          .on("mouseout", function () {
            // Hide the tooltip
            tooltip.style("opacity", 0);
            // Remove outline from the bar
            d3.select(this).attr("stroke", null);
          });

    // Add click event to the bars
    barsSelected.on("click", handleBarClick);
    barsOpposite.on("click", handleBarClick);

    // Create the x-axis
    svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height / 2})`) // Half the height for selected country chart
        .call(d3.axisBottom(xScale));

    // Remove the x-axis tick labels
    svg.select(".x-axis").selectAll(".tick text").remove();

    // Create the y-axis for selected country
    svg.append("g").attr("class", "y-axis-selected").call(d3.axisLeft(yScale));


    const awayScores = filteredData.map(d => d.away_score);
    const maximuum = d3.max(awayScores);
    // Define the custom tick format function
    function customTickFormat(d) {
        return ((d*-1)+maximuum).toFixed(0);
    }

    // Update the tick format for the y-axis
    svg.append("g")
        .attr("class", "y-axis-opposite")
        .call(d3.axisLeft(yScaleOpposite).tickFormat(customTickFormat));
}

//THIRD PART !!!

function handleBarClick(event, d) {
  const selectedCountry = document.getElementById("cur_country").value;
  const homeScore = d.home_score;
  const awayScore = d.away_score;
  
  // Calculate percentage
  const totalScore = homeScore + awayScore;
  const homePercentage = (homeScore / totalScore) * 100;
  const awayPercentage = (awayScore / totalScore) * 100;

  // Display match information
  const matchInfo = `Date: ${d.date}<br>
                    Tournament: ${d.tournament}<br><br>
                    Country: ${d.country}, City: ${d.city}<br><br>
                    Match: ${d.home_team} vs ${d.away_team}<br>
                    Score: ${homeScore} - ${awayScore}<br>
                    Percentage: ${homePercentage.toFixed(0)}% - ${awayPercentage.toFixed(0)}%`;

  // Update the pie chart and match information
  updatePieChart(homePercentage, awayPercentage);
  updateMatchInfo(matchInfo);
}


// Function to update the pie chart
function updatePieChart(homePercentage, awayPercentage) {
  const pieData = [
    { label: "Home", percentage: homePercentage },
    { label: "Away", percentage: awayPercentage }
  ];
  
  // Remove any existing pie chart
  d3.select("#pie-chart").select("svg").remove();
  
  // Create the SVG container for the pie chart
  const svg = d3
    .select("#pie-chart")
    .append("svg")
    .attr("width", 200)
    .attr("height", 200)
    .append("g")
    .attr("transform", "translate(100,100)");
  
  // Create the pie generator
  const pie = d3.pie().value(d => d.percentage);
  
  // Generate the arc data
  const arcData = pie(pieData);
  
  // Create the arc generator
  const arc = d3.arc().innerRadius(0).outerRadius(80);
  
  // Create the pie slices
  const slices = svg
    .selectAll("path")
    .data(arcData)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d, i) => (i === 0 ? "steelblue" : "orange"));
}

// Function to update the match information
function updateMatchInfo(matchInfo) {
  const matchInfoContainer = d3.select("#match-info");
  matchInfoContainer.html(matchInfo);
}