var jsdom = require('jsdom');
const {
    JSDOM
} = jsdom;

const d3 = require('d3');
const fs = require('fs');
const logger = require('./logger/logger');

const inv_nodes = require('./models/inv_nodes');
const inv_edges = require('./models/inv_edges');
const inv_map_add = require('./models/inv_map_add');
const {
    ConsoleTransportOptions
} = require('winston/lib/winston/transports');

// load async node data from DB
async function findNodeData() {
    node_data = await inv_nodes.find({});
    return node_data;
}

// load async edge data from DB
async function findEdgeData() {
    edge_data = await inv_edges.find({});
    return edge_data;
}

// load async edge data from DB
async function findMapAddData() {
    map_add_data = await inv_map_add.find({});
    return map_add_data;
}

// start when promise is available
findNodeData().then((nodes_data) => {
    if (nodes_data.length == 0) {
        logger.app.log('info', `inv_nodes - No record found !!!`);
        return
    } else {
        logger.app.log('info', `inv_nodes -  ${Object.keys(nodes_data).length} records from inv_nodes read`);
    }
});

// start when promise is available
findEdgeData().then((edges_data) => {
    if (edges_data.length == 0) {
        logger.app.log('info', `inv_edges - No record found !!!`);
        return
    } else {
        logger.app.log('info', `inv_edges -  ${Object.keys(edges_data).length} records from inv_edges read`);
    }
});

// start when promise is available
findMapAddData().then((maps_add_data) => {
    if (maps_add_data.length == 0) {
        logger.app.log('info', `inv_map_adds - No record found !!!`);
        return
    } else {
        logger.app.log('info', `inv_map_adds -  ${Object.keys(maps_add_data).length} records from inv_map_adds read`);
    }
});

// wait that both inv_regions and inv_solar_systems is ready before processing
Promise.all([findNodeData(), findEdgeData(), findMapAddData()]).then(data => {

    // Variables
    nodes_data = data[0];
    edges_data = data[1];
    map_add_data = data[2];

    // sort data on regions, constellations and solar systems
    solar_systems_data = [];
    constellation_data = [];
    regions_data = [];
    for (i in nodes_data) {
        // if id is 10000000-19999999 then it is region
        if (nodes_data[i].id >= 10000000 && nodes_data[i].id < 20000000) {
            regions_data.push(nodes_data[i]);
        }
        // if id is 20000000-29999999 then it is constellation
        if (nodes_data[i].id >= 20000000 && nodes_data[i].id < 30000000) {
            constellation_data.push(nodes_data[i]);
        }
        // if id is >30000000 then it is solar systems
        if (nodes_data[i].id >= 30000000) {
            solar_systems_data.push(nodes_data[i]);
        }
    }
    logger.app.log('info', `${regions_data.length} regions found`);
    logger.app.log('info', `${constellation_data.length} constellations found`);
    logger.app.log('info', `${solar_systems_data.length} solar systems found`);

    regions_to_process = [10000060]; 
    // regions_to_process = [];
    // for (i in regions_data) {
    //     regions_to_process.push(regions_data[i].id);
    // }

    // loop over regions and get system details
    for (i in regions_to_process) {

        region_id = regions_to_process[i];

        // find all systems of a ragion
        var all_systems_of_region = [];
        all_systems_of_region = solar_systems_data.filter(system => system.rid === region_id);
        logger.app.log('info', `${region_id}  - ${all_systems_of_region.length} systems found`);

        // find all map_add of a ragion
        var all_neighbours_of_region = [];
        for (i in map_add_data) {
            if (map_add_data[i].rid === region_id) {
                all_neighbours_of_region = map_add_data[i].add;
            }
        }
        for (i in all_neighbours_of_region) {
            add_system = solar_systems_data.filter(system => system.label === all_neighbours_of_region[i]);
            all_systems_of_region.push(add_system[0]);
        }
        logger.app.log('info', `${region_id}  - ${all_neighbours_of_region.length} neighbours added`);
        logger.app.log('info', `${region_id}  - ${all_systems_of_region.length} systems found`);

        // find all links of systems of a region
        link_data = [];
        for (i in all_systems_of_region) {
            for (j in edges_data) {
                if (all_systems_of_region[i].id == edges_data[j].source || all_systems_of_region[i].id == edges_data[j].target) {
                    link_data.push(edges_data[j]);
                }
            }
        }
        // remove links going out of region
        all_links_of_region = [];
        for (i in link_data) {
            found_source = false;
            found_target = false;
            for (j in all_systems_of_region) {
                if (link_data[i].source === all_systems_of_region[j].id) {
                    found_source = true;
                }
                if (link_data[i].target === all_systems_of_region[j].id) {
                    found_target = true;
                }
            }
            if (found_source && found_target) {
                all_links_of_region.push(link_data[i]);
            }

        }
        // find all constellations of a region
        all_constellation_of_region = constellation_data.filter(system => system.rid === region_id);
        logger.app.log('info', `${region_id}  - ${all_constellation_of_region.length} constellations found`);

        // Create Region SVG
        logger.app.log('info', `Start SVG Processing`);
        dom = new JSDOM(`<!DOCTYPE html><body></body>`);
        var chartWidth = 4000;                                                                                                  // SVG width
        var chartHeight = 4000;                                                                                                 // SVG hight
        var margin = 0;                                                                                                         // Margin

        // Calculate scaling for x and y
        const all_x = all_systems_of_region.map(function (item) { return item["x"] });                                          // all x's from all solar systems
        const all_y = all_systems_of_region.map(function (item) { return item["y"] });                                          // all y,s from all solar systems
        
        // smallest nagative and biggest positive x,y
        var smallest_x = d3.min(all_x);
        var greatest_x = d3.max(all_x);
        var smallest_y = d3.min(all_y);
        var greatest_y = d3.max(all_y);

        // calculate scaling 
        var scale_x = d3.scaleLinear()
            .domain([smallest_x, greatest_x])
            .range([0 + margin, chartWidth - margin]);
        var scale_y = d3.scaleLinear()
            .domain([smallest_y, greatest_y])
            .range([0 + margin, chartWidth - margin]);

        // SVG creation
        var body = d3.select(dom.window.document.querySelector("body"));
        var svg = body.append('svg')
            .attr('width', chartWidth)                                                                                          // add width
            .attr('height', chartHeight)                                                                                        // add height
            .attr('xmlns', 'http://www.w3.org/2000/svg')                                                                        // add xmlns
            .attr('viewBox', [0, 0, chartWidth, chartHeight])                                                                   // add viewbox
            .attr('data-width', chartWidth)                                                                                     // add data-width attribute for client processing
            .attr('data-height', chartHeight);                                                                                  // add data-height attribute for client processing
        logger.app.log('info', `${region_id} SVG created`);
        
        // background layer added
        var background_layer = svg.append("g")
            .attr("data-node-type", "background")
            .attr("data-node-rid", region_id)
            .attr("cursor", "move");                                                                                            // special curser for client added
        logger.app.log('info', `${region_id} SVG <- g (background) created`);

        // system background added         
        let voronoi = d3.Delaunay                                                                                               // Voronoi Test - https://observablehq.com/@d3/circle-dragging-iii?collection=@d3/d3-delaunay
            // Generate the delaunay triangulation of our data
            // takes data, x accessor and y accessor as arguments
            .from(all_systems_of_region, d => scale_x(d.x), d => scale_y(d.y))
            // Generate teh voronoi diagram from our delaunay triangulation
            // Takes the bounds of our diagram area as arguments [x0,y0,x1,y1]
            .voronoi([-50, -50, chartWidth+50, chartHeight+50]);        
        var system_background = background_layer.append("g")
            .attr("data-node-type", "solar_system_background");
        system_background.selectAll(null)
            .data(all_systems_of_region.map((d,i) => voronoi.renderCell(i)))
            .join('path')
            .attr('data-node-id', function(d,i){ return all_systems_of_region[i].id })
            .attr('data-node-rid', function(d,i){ return all_systems_of_region[i].rid })
            .attr('data-node-name', function(d,i){ return all_systems_of_region[i].label })
            .attr('d', d => d)
            .style('fill', "#191d21")
            .style('opacity', 1.0)
            .style('stroke', '#ffffff')
            .style('stroke-opacity', 0.1)
            .style("stroke-width", 1);
        logger.app.log('info', `${region_id} SVG <- g (system background) <- path added`);

        // add constellation data to background layer
        var constellations = background_layer.append("g")
            .attr('data-node-type', 'constellations');
        constellations.selectAll(null)
            .data(all_constellation_of_region)                                                                              // add constellation data
            .enter()
            .append('text')                                                                                                 // append text element
            .attr('data-node-name',function (d) { return d.label })                                                         // constellation
            .attr('data-node-id',function (d) { return d.id })                                                              // constellation id
            .attr('data-node-name',function (d) { return d.label })                                                         // constellation label
            .attr('data-node-rid',function (d) { return d.rid })                                                            // constellation region id
            .attr('data-node-sec',function (d) { return d.sec })                                                            // constellation security
            .text(function (d) { return d.label })                                                                          // enter name as label
            .attr("x", function (d) { return scale_x(d.x) })                                                                // position and scale x based on data
            .attr("y", function (d) { return scale_y(d.y) })                                                                // position and scale y based on data
            .attr("text-anchor", "middle")                                                                                  // take x,y as the middle point for the text label
            .style("fill", "grey")                                                                                          // color text
            .style("fill-opacity", 0.5)                                                                                     // set transparency
            .style("font-size", "48px");                                                                                    // set text size        
        logger.app.log('info', `${region_id} SVG <- g (constellations) <- text labels for constellations added`);
        
        //calculate links between systems          
        let links = {}; 
        var counter = 1; 
        for (i of all_links_of_region) { 
            source = i.source;                                                                                              // source system id
            target = i.target;                                                                                              // target system id    
            source_obj = solar_systems_data.find(function (el) { return el.id === source });                                // get source details                                     
            target_obj = solar_systems_data.find(function (el) { return el.id === target });                                // get target details
            startx = scale_x(source_obj.x);                                                                                 // scale x,?,?,?
            starty = scale_y(source_obj.y);                                                                                 // scale x,y,?,?
            endx = scale_x(target_obj.x);                                                                                   // scale x,y,x,?
            endy = scale_y(target_obj.y);                                                                                   // scale x,y,x,y
            if (i.color == "#CCC"){ type = ''; }                                                                            // Line-Type: *_*_*_*
            if (i.color == "#39F"){ type = '5,5,20,5,5,20'; }                                                               // Line-Type: *_ ****_*____*_ ****_*____    
            if (i.color == "#0C6"){ type = '20,20'; }                                                                       // Line-Type: ****____****____
            links[source + "," + target] = {                                                                                // enter array key ["30005xxx,30006xxx"]
                "startx": startx,                                                                                           // save x,?,?,?
                "starty": starty,                                                                                           // save ?,y,?,?
                "endx": endx,                                                                                               // save ?,?,x,?
                "endy": endy,                                                                                               // save ?,?,?,y
                "color": i.color,                                                                                           // save color
                "size": i.size,                                                                                             // save size
                "type": type                                                                                                // dotted line config
            };
            if (links[source + "," + target].color == '#CCC'){ links[source + "," + target].color = "#fff"; }               // overwrite white color 
            if (links[source + "," + target].color == '#0C6'){ links[source + "," + target].color = "#fff"; }               // overwrite green color 
            //if (links[source + "," + target].color == '#39F'){ links[source + "," + target].color = "#d10f0f"; }          // overwrite blue color
            counter++; 
        };
        logger.app.log('info', `${region_id} SVG ${counter} of links to be processed`);
        
        // add links between systems 
        var system_links = background_layer.append("g")
                .attr('data-node-type', 'links');
        var counter = 1;
        for (var i in links) {
            system_links
                .append("line")                                                                                             // attach a line
                .attr('data-node-type', 'link')                                                                             // node type
                .style("stroke", links[i].color)                                                                            // colour the line
                .style("stroke-dasharray", links[i].type)                                                                   // dotted line type
                .style("stroke-width", links[i].size * 25)                                                                  // set line thickness
                .attr("x1", links[i].startx)                                                                                // x position of the first end of the line
                .attr("y1", links[i].starty)                                                                                // y position of the first end of the line
                .attr("x2", links[i].endx)                                                                                  // x position of the second end of the line
                .attr("y2", links[i].endy);                                                                                 // y position of the second end of the line
            counter++;
        };
        logger.app.log('info', `${region_id} SVG <- g <- line added for system links: ${counter}`);

        // add solar system data to background layer
        var solar_systems = background_layer.append("g")
            .attr('data-node-type', 'solar_systems');
        solar_systems.selectAll(null)
            .data(all_systems_of_region)                                                                                    // solar system data added
            .enter() 
            .append('g')
            .attr("data-node-id", function (d) { return d.id })                                                             // add data attribute with node id 
            .attr("data-node-name", function (d) { return d.label })
            .append('text')                                                                                                 // append text element
            .text(function (d) { return d.label })                                                                          // enter name as label
            .attr("data-node-id", function (d) { return d.id })                                                             // add data attribute with node id 
            .attr("data-node-name", function (d) { return d.label })
            .attr("x", function (d) { return scale_x(d.x) - 20 })                                                           // position and scale x based on data
            .attr("y", function (d) { return scale_y(d.y) + 10 })                                                           // position and scale y based on data
            .attr("text-anchor", "end")                                                                                     // take x,y as the middle point for the text label
            .style("fill", "#ffffff")                                                                                       // color text
            .style("fill-opacity", 0.7)                                                                                     // set transparency
            .style("font-size", "24px")                                                                                     // set text size
        logger.app.log('info', `${region_id} SVG <- g <- text labels for systems added`);

        // add solar systems 
        solar_systems.selectAll(null)
            .data(all_systems_of_region)                                                                                    // system data added
            .enter() 
            .append('circle')                                                                                               // attache a circle
            .attr("cx", function (d) { return scale_x(d.x) })                                                               // add center x
            .attr("cy", function (d) { return scale_y(d.y) })                                                               // add center y
            .attr("r", function (d) { return d.size * 15 })                                                                 // add radius
            .attr("data-node-type", "solar_system")                                                                         // add data attribute with node-type
            .attr("data-node-id", function (d) { return d.id })                                                             // add data attribute with node-id
            .attr("data-node-sec", function (d) { return d.sec })                                                           // add data attribute with node-sec
            .attr("data-node-name", function (d) { return d.label })                                                        // add data attribute with node-name
            .attr("data-node-region", function (d) { return d.rid })                                                        // add data attribute with node-region
            .attr("cursor", "help")
            .style("fill-opacity", 1.0)                                                                                     // set transparency
            .style("stroke", "#ffffff")                                                                                     // set line color
            .style("stroke-width", 2)                                                                                       // set line thickness
            .style("fill", "#000000")                                                                                       // set the fill colour
            .attr("class", "circle");                                                                                       // set the class for :not selector later in UI
        logger.app.log('info', `${region_id} SVG <- g <- circle for solar systems added`);

        // save SVG
        fs.writeFileSync(`./src/public/media/${region_id}.svg`, body.html());                                               // save regions.svg
        logger.app.log('info', `${region_id} SVG saved`);
    }
});