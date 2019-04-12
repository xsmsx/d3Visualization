(function (topojson,d3) {
    'use strict';

    const loadAndProcessData = () =>
        Promise
            .all([
                d3.csv('./viz.csv'),
                d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
                d3.json("https://unpkg.com/world-atlas@1/world/110m.json")

                ])
            .then(([myData, tsvData, topoJSONdata]) => {
                const rowById = myData.reduce((accumulator, d) => {
                    accumulator[d['Country Code']] = d;
                    return accumulator;
                }, {});

                const countries = topojson.feature(topoJSONdata, topoJSONdata.objects.countries);

                countries.features.forEach(d => {
                    Object.assign(d.properties, rowById[d.id]);
                });

                var featuresWithNEET = countries.features;

                return {
                    features: countries.features,
                    featuresWithNEET
                };
            });

        var inputValue = null;
        const time = ["1990","1990","2000","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017"];
        const svg = d3.select('svg');
        const projection = d3.geoNaturalEarth1();
        const pathGenerator = d3.geoPath().projection(projection);
        const g = svg.append('g');

        g.append('path')
            .attr('class', 'sphere')
            .attr('d', pathGenerator({type: 'Sphere'}));

        svg.call(d3.zoom().on('zoom', () => {
            g.attr('transform', d3.event.transform);
        }));

        const populationFormat = d3.format('.2g');
        let radiusValue = d => d.properties[inputValue];
        var filterFloor = 0;
        var filterCeiling = 100;



    loadAndProcessData().then(countries => {

        var sizeLegend = (selection, props) => {
            var {
                sizeScale,
                colorScale,
                spacing,
                textOffset,
                numTicks,
                tickFormat
            } = props;

            var ticks = sizeScale.ticks(numTicks)
                .filter(d => d !== 0)
                .reverse();

            var groups = selection.selectAll('g').data(ticks);

            var groupsEnter = groups
                .enter().append('g')
                .attr('class', 'tick');

            groupsEnter
                .merge(groups)
                .attr('transform', (d, i) =>
                    `translate(0, ${i * spacing})`
                );
            groups.exit().remove();

            groupsEnter.append('circle')
                .attr('class', 'legend-circle')
                .merge(groups.select('circle'))
                .attr('r', sizeScale)
                .attr('fill', colorScale)
                .attr('fill-opacity', '0.6')
                .attr('stroke', 'none')
                .on("mousedown", function(d){
                    // console.log(d); // shows which object you are hovering over
                    onMouseDown(d);
                });

            groupsEnter.append('text')
                .merge(groups.select('text'))
                .text(tickFormat)
                .attr('class', 'legend-text')
                .attr('dy', '0.32em')
                .attr('x', d => sizeScale(d) + textOffset)
                .attr('fill','#BCC6CC');

        };

        update("1990");

        d3.select("#timeslide").on("input", function() {
            update(+this.value);
        });

        d3.select("#play").on("click", function(){
            let i = 0, howManyTimes = 12;
            function f() {
                i++;
                update(i);
                if( i < howManyTimes ){
                    setTimeout( f, 1700 );
                }
            }
            f();

        });

        function update(value) {
            document.getElementById("range").innerHTML= time[value] === undefined? "Select Year" : time[value];
            inputValue = time[parseInt(value)];
            // console.log(typeof(value), parseInt(value));
            // console.log("value: ", typeof(inputValue), inputValue);
            radiusValue = d => d.properties[inputValue];
            // console.log("input: ", inputValue);
            updateMap();
        }

        function updateMap(){
            g.selectAll('circle').remove();
            g.selectAll('g').remove();
            g.selectAll('text').remove();

            countries.featuresWithNEET.forEach(d => {
                d.properties.projected = projection(d3.geoCentroid(d));
            });

            countries.featuresWithNEET = countries.features
                .filter(d => d.properties[inputValue])
                .filter(d => d.properties[inputValue] <= filterCeiling)
                .filter(d => d.properties[inputValue] >= filterFloor)
                .map(d => {
                    d.properties[inputValue] = +d.properties[inputValue];
                    return d;
                });

            var countryPath = g.selectAll('path').data(countries.features);

            countryPath
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', pathGenerator)
                .append('title');

            countryPath.select("title")
                // .attr('onMouseover', function)
                .text( d =>
                    isNaN(radiusValue(d))
                        ? "Missing Data"
                        : [
                            d.properties['Country Name'],
                            d3.format(".2f")(radiusValue(d))
                        ].join(': ')

                );

            var sizeScale = d3.scaleSqrt().nice(5)
                .domain([0,50])
                .range([0, 8]);

            var colorScale = d3.scaleQuantize().nice(5)
                .domain([0, 50])
                .range(['#1a9850', '#66bd63', '#a6d96a', '#d9ef8b', '#fee08b', '#fdae61', '#f46d43', '#d73027']);

            g.selectAll('circle').data(countries.featuresWithNEET)
                .enter().append('circle')
                .attr('class', 'country-circle')
                .attr('cx', d => d.properties.projected[0])
                .attr('cy', d => d.properties.projected[1])
                .attr("r", 1)
                .transition().duration(350)
                .attr('r', d => sizeScale(radiusValue(d)))
                .style("fill", function (d) {
                    // console.log("radius value: ", radiusValue(d));
                    return colorScale(radiusValue(d));
                })
                .style("stroke", "none");

            d3.selectAll("circle")
                .on("mouseover", function () {
                    d3.select(this)
                        .append("svg:title")
                        .text(function(d) {
                            return [
                                d.properties['Country Name'],
                                radiusValue(d),
                            ].join(': ');
                        })
                });

            g.append('g')
                .attr('transform', `translate(45,215)`)
                .call(sizeLegend, {
                    sizeScale,
                    colorScale,
                    spacing: 35,
                    textOffset: 5,
                    numTicks: 5,
                    tickFormat: populationFormat
                })
                .append('text')
                .attr('class', 'legend-title')
                .text('NEET % in Youth')
                .style('stroke', 'none')
                .style('fill', '#BCC6CC')
                .attr('y', -35)
                .attr('x', -30)
                .exit()
                .remove();
             }

             function onMouseDown(ceiling){
                filterCeiling = ceiling === 50? 100 : ceiling;
                filterFloor = ceiling - 10;
                update();
             }

        });

}(topojson,d3));
