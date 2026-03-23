// ============================================================
// US Manufacturing Skills Gap — Main Application
// ============================================================

(function () {
    'use strict';

    // === DATA LOADING ===
    // Swap these paths to use real data files.
    // numeracy.json: { "01001": { "rate": 42, "name": "Autauga", "state": "AL" }, ... }
    // demand.json:   [ { "id": "d1", "name": "Detroit, MI", "lat": 42.33, "lng": -83.04, "demand": 8500, "description": "..." }, ... ]
    Promise.all([
        d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json'),
        d3.json('data/numeracy.json').catch(() => {
            console.warn('numeracy.json not found — using generated sample data');
            return null;
        }),
        d3.json('data/demand.json').catch(() => {
            console.warn('demand.json not found — using generated sample data');
            return null;
        })
    ]).then(([us, numeracyRaw, demandRaw]) => {
        // If local data files are missing, generate plausible sample data
        const numeracyData = numeracyRaw || generateSampleNumeracy(us);
        const demandData = demandRaw || generateSampleDemand();

        buildMap(us, numeracyData, demandData);
    }).catch(err => {
        console.error('Failed to load map topology:', err);
        document.getElementById('info-content').textContent =
            'Error loading map data. Check the console for details.';
    });

    // ----------------------------------------------------------
    // Sample data generators (used when local JSON files are absent)
    // ----------------------------------------------------------
    function generateSampleNumeracy(us) {
        const stateFips = {
            '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
            '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
            '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
            '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
            '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
            '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
            '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
            '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
            '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
            '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
            '56': 'WY'
        };
        // State-level base rates (some states tend higher/lower)
        const stateBase = {
            'MA': 72, 'CT': 70, 'NJ': 68, 'MD': 66, 'VA': 64, 'CO': 67,
            'MN': 68, 'WA': 65, 'NH': 70, 'VT': 69, 'CA': 58, 'NY': 60,
            'IL': 59, 'PA': 57, 'OH': 50, 'MI': 48, 'IN': 46, 'WI': 55,
            'IA': 56, 'MO': 49, 'KS': 52, 'NE': 54, 'SD': 53, 'ND': 55,
            'MT': 54, 'ID': 52, 'WY': 51, 'UT': 58, 'NV': 45, 'AZ': 47,
            'NM': 42, 'TX': 48, 'OK': 44, 'AR': 38, 'LA': 36, 'MS': 32,
            'AL': 37, 'TN': 42, 'KY': 40, 'WV': 35, 'SC': 41, 'NC': 50,
            'GA': 47, 'FL': 50, 'HI': 60, 'AK': 52, 'OR': 60, 'DE': 58,
            'RI': 56, 'DC': 62, 'ME': 58
        };
        const data = {};
        const counties = topojson.feature(us, us.objects.counties).features;
        // seeded-ish pseudo-random
        let seed = 12345;
        function rand() {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        }
        counties.forEach(f => {
            const fips = String(f.id).padStart(5, '0');
            const stCode = fips.slice(0, 2);
            const st = stateFips[stCode] || '??';
            const base = stateBase[st] || 50;
            const rate = Math.max(5, Math.min(98, Math.round(base + (rand() - 0.5) * 30)));
            data[fips] = {
                rate: rate,
                name: f.properties && f.properties.name ? f.properties.name : 'County ' + fips,
                state: st
            };
        });
        return data;
    }

    function generateSampleDemand() {
        return [
            { id: 'd01', name: 'Detroit, MI',           lat: 42.3314, lng: -83.0458, demand: 9200,  description: 'Automotive manufacturing hub with high CNC machinist demand' },
            { id: 'd02', name: 'Houston, TX',            lat: 29.7604, lng: -95.3698, demand: 8100,  description: 'Petrochemical and energy equipment manufacturing' },
            { id: 'd03', name: 'Chicago, IL',            lat: 41.8781, lng: -87.6298, demand: 7500,  description: 'Diversified manufacturing — metals, food processing, machinery' },
            { id: 'd04', name: 'Los Angeles, CA',        lat: 34.0522, lng: -118.2437,demand: 6800,  description: 'Aerospace and electronics assembly' },
            { id: 'd05', name: 'Cleveland, OH',          lat: 41.4993, lng: -81.6944, demand: 5900,  description: 'Steel, polymers, and advanced materials' },
            { id: 'd06', name: 'Milwaukee, WI',          lat: 43.0389, lng: -87.9065, demand: 5400,  description: 'Heavy machinery and electrical equipment' },
            { id: 'd07', name: 'Charlotte, NC',          lat: 35.2271, lng: -80.8431, demand: 4800,  description: 'Automotive parts and textiles' },
            { id: 'd08', name: 'Pittsburgh, PA',         lat: 40.4406, lng: -79.9959, demand: 4500,  description: 'Advanced manufacturing and robotics' },
            { id: 'd09', name: 'Indianapolis, IN',       lat: 39.7684, lng: -86.1581, demand: 4200,  description: 'Pharmaceutical and automotive manufacturing' },
            { id: 'd10', name: 'Phoenix, AZ',            lat: 33.4484, lng: -112.0740,demand: 4000,  description: 'Semiconductor fabrication growth corridor' },
            { id: 'd11', name: 'San Jose, CA',           lat: 37.3382, lng: -121.8863,demand: 3800,  description: 'Semiconductor and electronics manufacturing' },
            { id: 'd12', name: 'Dallas, TX',             lat: 32.7767, lng: -96.7970, demand: 3700,  description: 'Electronics and defense manufacturing' },
            { id: 'd13', name: 'Minneapolis, MN',        lat: 44.9778, lng: -93.2650, demand: 3500,  description: 'Medical devices and food processing' },
            { id: 'd14', name: 'St. Louis, MO',          lat: 38.6270, lng: -90.1994, demand: 3300,  description: 'Aerospace and defense assembly' },
            { id: 'd15', name: 'Grand Rapids, MI',       lat: 42.9634, lng: -85.6681, demand: 3100,  description: 'Furniture, automotive parts, and metal fabrication' },
            { id: 'd16', name: 'Greenville, SC',         lat: 34.8526, lng: -82.3940, demand: 2900,  description: 'Automotive and tire manufacturing' },
            { id: 'd17', name: 'Portland, OR',           lat: 45.5152, lng: -122.6784,demand: 2700,  description: 'Metals, electronics, and clean energy equipment' },
            { id: 'd18', name: 'Wichita, KS',            lat: 37.6872, lng: -97.3301, demand: 2500,  description: 'Aviation manufacturing capital' },
            { id: 'd19', name: 'Birmingham, AL',         lat: 33.5186, lng: -86.8104, demand: 2200,  description: 'Iron, steel, and pipe manufacturing' },
            { id: 'd20', name: 'Tulsa, OK',              lat: 36.1540, lng: -95.9928, demand: 2000,  description: 'Aerospace components and oil-field equipment' },
            { id: 'd21', name: 'Salt Lake City, UT',     lat: 40.7608, lng: -111.8910,demand: 1800,  description: 'Defense tech and biomedical devices' },
            { id: 'd22', name: 'Raleigh, NC',            lat: 35.7796, lng: -78.6382, demand: 1600,  description: 'Pharmaceutical and biotech manufacturing' },
            { id: 'd23', name: 'Seattle, WA',            lat: 47.6062, lng: -122.3321,demand: 3600,  description: 'Aerospace (Boeing) and shipbuilding' },
            { id: 'd24', name: 'Buffalo, NY',            lat: 42.8864, lng: -78.8784, demand: 1400,  description: 'Advanced materials and chemical manufacturing' },
            { id: 'd25', name: 'Louisville, KY',         lat: 38.2527, lng: -85.7585, demand: 2400,  description: 'Automotive assembly and appliance manufacturing' },
            { id: 'd26', name: 'Hartford, CT',           lat: 41.7658, lng: -72.6734, demand: 2100,  description: 'Jet engines and precision machining' },
            { id: 'd27', name: 'Cincinnati, OH',         lat: 39.1031, lng: -84.5120, demand: 2600,  description: 'Machine tools and consumer products' },
            { id: 'd28', name: 'Memphis, TN',            lat: 35.1495, lng: -90.0490, demand: 1500,  description: 'Food processing and medical equipment' },
            { id: 'd29', name: 'Baton Rouge, LA',        lat: 30.4515, lng: -91.1871, demand: 1300,  description: 'Petrochemical processing equipment' },
            { id: 'd30', name: 'Anchorage, AK',          lat: 61.2181, lng: -149.9003,demand: 700,   description: 'Oil and gas extraction equipment' }
        ];
    }

    // ----------------------------------------------------------
    // Main map builder
    // ----------------------------------------------------------
    function buildMap(us, numeracyData, demandData) {
        const container = document.getElementById('map-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // === PROJECTION ===
        // AlbersUsa handles Alaska/Hawaii insets.
        // Used for BOTH county paths AND demand circles.
        const countiesGeo = topojson.feature(us, us.objects.counties);
        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], countiesGeo);
        const path = d3.geoPath().projection(projection);

        // SVG setup with viewBox for basic responsiveness
        const svg = d3.select('#map')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Layer groups (back to front)
        const gCounties = svg.append('g').attr('class', 'counties');
        const gStates   = svg.append('g').attr('class', 'states');
        const gDemand   = svg.append('g').attr('class', 'demand-circles');

        // === COLOR SCALE ===
        // Rate = % of adults below basic numeracy (Num_P1 from PIAAC).
        // HIGHER rate = MORE people can't do basic math = DARKER color (worse).
        const colorBreaks = [15, 20, 25, 30, 35, 40, 50, 60];
        const colorRange  = [
            '#FFFFCC',   //  0–14  (lightest — fewest struggling)
            '#FFEDA0',   // 15–19
            '#FED976',   // 20–24
            '#FEB24C',   // 25–29
            '#FD8D3C',   // 30–34
            '#FC4E2A',   // 35–39
            '#E31A1C',   // 40–49
            '#BD0026',   // 50–59
            '#800026'    // 60+   (darkest — most can't do basic math)
        ];
        const colorScale = d3.scaleThreshold()
            .domain(colorBreaks)
            .range(colorRange);

        const neutralGray = '#2c2c3e';

        // Helper: look up numeracy record by FIPS
        function getNumeracy(fips) {
            const padded = String(fips).padStart(5, '0');
            return numeracyData[padded] || numeracyData[String(+fips)] || null;
        }

        // === COUNTY LAYER ===
        gCounties.selectAll('path')
            .data(countiesGeo.features)
            .join('path')
            .attr('class', 'county-path')
            .attr('d', path)
            .attr('fill', d => {
                const rec = getNumeracy(d.id);
                return rec ? colorScale(rec.rate) : neutralGray;
            })
            .on('mouseover', function (event, d) {
                d3.select(this).raise();
                const rec = getNumeracy(d.id);
                updateInfoPanel(rec, d.id);
            })
            .on('mouseout', function () {
                resetInfoPanel();
            });

        // === STATE BORDERS ===
        const stateMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
        gStates.append('path')
            .datum(stateMesh)
            .attr('class', 'state-border')
            .attr('d', path);

        // === DEMAND LAYER ===
        const radiusScale = d3.scaleSqrt()
            .domain([500, 10000])
            .range([5, 35]);

        gDemand.selectAll('circle')
            .data(demandData)
            .join('circle')
            .attr('class', 'demand-circle')
            .each(function (d) {
                const coords = projection([d.lng, d.lat]);
                if (coords) {
                    d._x = coords[0];
                    d._y = coords[1];
                    d._visible = true;
                } else {
                    d._visible = false;
                }
            })
            .filter(d => d._visible)
            .attr('cx', d => d._x)
            .attr('cy', d => d._y)
            .attr('r', d => radiusScale(d.demand))
            .attr('fill', 'rgba(70, 130, 180, 0.6)')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1)
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .attr('fill', 'rgba(70, 130, 180, 0.9)')
                    .attr('stroke-width', 2);
                updateInfoPanelDemand(d);
            })
            .on('mouseout', function (event, d) {
                d3.select(this)
                    .attr('fill', 'rgba(70, 130, 180, 0.6)')
                    .attr('stroke-width', 1);
                resetInfoPanel();
            });

        // === NEW LAYERS ===
        // Add additional data layers here.
        // Append new <g> groups to svg and draw features using the same projection.

        // ----------------------------------------------------------
        // Info panel helpers
        // ----------------------------------------------------------
        function updateInfoPanel(rec, fips) {
            const el = document.getElementById('info-content');
            if (!rec) {
                el.innerHTML =
                    `<div class="county-name">FIPS ${String(fips).padStart(5, '0')}</div>` +
                    `<div class="county-state">No data available</div>`;
                return;
            }
            const countyName = rec.county || rec.name || 'Unknown';
            el.innerHTML =
                `<div class="county-name">${countyName} County</div>` +
                `<div class="county-state">${rec.state}</div>` +
                `<div class="info-row">` +
                    `<span class="info-label">Below Basic Numeracy</span>` +
                    `<span class="info-value">${rec.rate}%</span>` +
                `</div>`;
        }

        function updateInfoPanelDemand(d) {
            const el = document.getElementById('info-content');
            el.innerHTML =
                `<div class="county-name">${d.name}</div>` +
                `<div class="info-row">` +
                    `<span class="info-label">Skilled Labor Demand</span>` +
                    `<span class="info-value">${d.demand.toLocaleString()}</span>` +
                `</div>` +
                (d.description
                    ? `<div class="info-description">${d.description}</div>`
                    : '');
        }

        function resetInfoPanel() {
            document.getElementById('info-content').textContent =
                'Hover over the map to explore';
        }

        // ----------------------------------------------------------
        // Layer toggles
        // ----------------------------------------------------------
        document.getElementById('toggle-numeracy').addEventListener('change', function () {
            gCounties.style('display', this.checked ? null : 'none');
        });
        document.getElementById('toggle-demand').addEventListener('change', function () {
            gDemand.style('display', this.checked ? null : 'none');
        });

        // === LEGENDS ===
        buildColorLegend(colorScale, colorBreaks, colorRange);
        buildSizeLegend(radiusScale);

        // ----------------------------------------------------------
        // Window Resize
        // ----------------------------------------------------------
        window.addEventListener('resize', function () {
            const w = container.clientWidth;
            const h = container.clientHeight;
            projection.fitSize([w, h], countiesGeo);
            svg.attr('viewBox', `0 0 ${w} ${h}`);

            // Redraw county paths
            gCounties.selectAll('path').attr('d', path);

            // Redraw state borders
            gStates.select('path').attr('d', path);

            // Reproject demand circles
            gDemand.selectAll('circle').each(function (d) {
                const coords = projection([d.lng, d.lat]);
                if (coords) {
                    d3.select(this)
                        .attr('cx', coords[0])
                        .attr('cy', coords[1])
                        .style('display', null);
                } else {
                    d3.select(this).style('display', 'none');
                }
            });
        });
    }

    // ----------------------------------------------------------
    // Legend builders
    // ----------------------------------------------------------
    function buildColorLegend(colorScale, breaks, colors) {
        const wrapper = document.getElementById('color-legend');
        wrapper.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'legend-title';
        title.textContent = '% Below Basic Numeracy';
        wrapper.appendChild(title);

        // Color bar
        const bar = document.createElement('div');
        bar.className = 'legend-bar';
        colors.forEach(c => {
            const seg = document.createElement('div');
            seg.className = 'legend-bar-segment';
            seg.style.background = c;
            bar.appendChild(seg);
        });
        wrapper.appendChild(bar);

        // Labels
        const labels = document.createElement('div');
        labels.className = 'legend-labels';
        const lo = document.createElement('span');
        lo.textContent = 'Fewer';
        const hi = document.createElement('span');
        hi.textContent = 'More';
        labels.appendChild(lo);
        labels.appendChild(hi);
        wrapper.appendChild(labels);

        // Tick marks showing breakpoints
        const ticks = document.createElement('div');
        ticks.style.cssText =
            'display:flex; justify-content:space-between; font-size:9px; color:#6a7190; margin-top:2px; padding: 0 2px;';
        const showMarks = [0, 15, 30, 45, 60, '80+'];
        showMarks.forEach(v => {
            const t = document.createElement('span');
            t.textContent = v + '%';
            ticks.appendChild(t);
        });
        wrapper.appendChild(ticks);
    }

    function buildSizeLegend(radiusScale) {
        const wrapper = document.getElementById('size-legend');
        wrapper.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'legend-title';
        title.textContent = 'Labor Demand';
        wrapper.appendChild(title);

        const row = document.createElement('div');
        row.className = 'circles-row';

        const sizes = [1000, 5000, 10000];
        sizes.forEach(val => {
            const r = radiusScale(val);
            const item = document.createElement('div');
            item.className = 'circle-item';

            // SVG circle
            const svgNS = 'http://www.w3.org/2000/svg';
            const svgEl = document.createElementNS(svgNS, 'svg');
            const diam = Math.ceil(r * 2) + 4;
            svgEl.setAttribute('width', diam);
            svgEl.setAttribute('height', diam);
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', diam / 2);
            circle.setAttribute('cy', diam / 2);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', 'rgba(70, 130, 180, 0.6)');
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '1');
            svgEl.appendChild(circle);
            item.appendChild(svgEl);

            const label = document.createElement('div');
            label.className = 'circle-label';
            label.textContent = val >= 1000 ? (val / 1000) + 'k' : val;
            item.appendChild(label);

            row.appendChild(item);
        });

        wrapper.appendChild(row);
    }

})();
