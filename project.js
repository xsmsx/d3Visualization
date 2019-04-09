(function (topojson,d3) {
    'use strict';

    const loadAndProcessData = () =>
        Promise
            .all([
                d3.csv('./viz.csv'),
                d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
                d3.json('https://unpkg.com/visionscarto-world-atlas@0.0.4/world/50m.json')
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
                const featuresWithNEET = countries.features
                    .filter(d => d.properties['2017'])
                    .map(d => {
                        d.properties['2017'] = +d.properties['2017'].replace(/ /g, '');
                        return d;
                    });

                return {
                    features: countries.features,
                    featuresWithNEET
                };
            });

    const svg = d3.select('svg');

    const projection = d3.geoNaturalEarth1();
    const pathGenerator = d3.geoPath().projection(projection);
    const radiusValue = d => d.properties['2017'];

    const g = svg.append('g');
    //
    // const colorLegendG = svg.append('g')
    //     .attr('transform', `translate(40,310)`);

    g.append('path')
        .attr('class', 'sphere')
        .attr('d', pathGenerator({type: 'Sphere'}));

    svg.call(d3.zoom().on('zoom', () => {
        g.attr('transform', d3.event.transform);
    }));

    const populationFormat = d3.format(',');
    const colorValue = d =>d.properties['2017'];

    loadAndProcessData().then(countries => {

        const sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(countries.features, radiusValue)])
            .range([0, 8]);

        const colorScale = d3.scaleQuantize()
            .domain([0, d3.max(countries.features, function(d) { return radiusValue(d); })])
            .range(['#1a9850', '#66bd63', '#a6d96a', '#d9ef8b', '#fee08b', '#fdae61', '#f46d43', '#d73027'])

        g.selectAll('path').data(countries.features)
            .enter().append('path')
            .attr('class', 'country')
            .attr('d', pathGenerator)
            .attr('fill', d => d.properties['2017'] ? '#e8e8e8' : '#fecccc')
            .append('title')
            .text(d =>
                isNaN(radiusValue(d))
                    ? 'Missing data'
                    : [
                        d.properties['Country Name'],
                        radiusValue(d)
                    ].join(': ')
            );

        countries.featuresWithNEET.forEach(d => {
            d.properties.projected = projection(d3.geoCentroid(d));
        });

        g.selectAll('circle').data(countries.featuresWithNEET)
            .enter().append('circle')
            .attr('class', 'country-circle')
            .attr('cx', d => d.properties.projected[0])
            .attr('cy', d => d.properties.projected[1])
        //    .attr('r', 2);
            .attr('r', d => sizeScale(radiusValue(d)))
            .style("fill", function(d){
                return colorScale(radiusValue(d));
            })
            .style("stroke", "none");

        d3.selectAll("circle").on("mouseover", function(){
            d3.select(this).lower();
        });

        d3.selectAll("circle").on("mouseout", function(){
            d3.select(this).transition(d3.select(this).raise()).duration(1000);

        // .transition()
        //         .duration(750)
            d3.select(this).raise();
        });

        d3.selectAll("path").on("mouseover", function(){
            d3.select(this).data(countries.features)
                .style("fill", function(d){
                    console.log(radiusValue(d));
                    if (d!=undefined) return colorScale(radiusValue(d));
                });
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
            .text('Youth in NEET (%)')
            .attr('y', -35)
            .attr('x', -30)
            .style("fill", function(d){
                if (d!=undefined) return colorScale(radiusValue(d));
            });

    });

    const sizeLegend = (selection, props) => {
        const {
            sizeScale,
            colorScale,
            spacing,
            textOffset,
            numTicks,
            tickFormat
        } = props;

        const ticks = sizeScale.ticks(numTicks)
            .filter(d => d !== 0)
            .reverse();

        const groups = selection.selectAll('g').data(ticks);
        const groupsEnter = groups
            .enter().append('g')
            .attr('class', 'tick');
        groupsEnter
            .merge(groups)
            .attr('transform', (d, i) =>
                `translate(0, ${i * spacing})`
            );
        groups.exit().remove();

        groupsEnter.append('circle')
            .merge(groups.select('circle'))
            .attr('r', sizeScale)
            .attr('fill', colorScale)
            .attr('stroke', 'none');

        groupsEnter.append('text')
            .merge(groups.select('text'))
            .text(tickFormat)
            .attr('dy', '0.32em')
            .attr('x', d => sizeScale(d) + textOffset);

    };

}(topojson,d3));
