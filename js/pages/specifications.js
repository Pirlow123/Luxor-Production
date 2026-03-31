/**
 * Specifications Page — Equipment specs library
 */
const SpecificationsPage = {

    _activeCategory: 'all',
    _searchTerm: '',
    _expandedItems: new Set(),

    // ================================================================
    // EQUIPMENT DATABASE
    // ================================================================

    _equipment: {
        // ── MOVING LIGHTS ──────────────────────────────────────────
        lighting: {
            label: 'Moving Lights & Fixtures',
            icon: 'fa-lightbulb',
            items: [
                {
                    id: 'robe-megapointe',
                    brand: 'Robe',
                    model: 'MegaPointe',
                    image: null,
                    category: 'Moving Light',
                    specs: {
                        'Source': '470W short-arc discharge lamp',
                        'Luminous Flux': '24,000 lm',
                        'CRI': '80+',
                        'Color Temperature': '7,800K (lamp)',
                        'CMY + CTO': 'Yes, continuous',
                        'Color Wheels': '2 — 14 dichroic filters + open',
                        'Gobos (Rotating)': '9 + open, indexable & rotating',
                        'Gobos (Static)': '14 + open',
                        'Prism': '6-facet circular + 8-facet linear',
                        'Frost': '2 — light + heavy',
                        'Zoom': '1.8° – 21° (beam) / 5° – 36° (spot)',
                        'Iris': 'Motorized, pulse effects',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 280°, 16-bit',
                        'DMX Channels': '38 / 34 / 30',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN, W-DMX',
                        'Power': '600W, auto-switching 100-240V',
                        'Weight': '23.7 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '321 × 278 × 622 mm (head)',
                    }
                },
                {
                    id: 'robe-spiider',
                    brand: 'Robe',
                    model: 'Robin SPIIDER',
                    category: 'LED Wash',
                    specs: {
                        'Source': '18 × 40W RGBW LEDs (main) + 1 × 60W RGBW LED (center)',
                        'Total Power Draw': '750W',
                        'Luminous Flux': '13,500 lm',
                        'CRI': '70+ (full white)',
                        'Color Mixing': 'RGBW per pixel',
                        'Pixel Mapping': '19 individually controllable zones',
                        'Zoom': '3.5° – 43° (main)',
                        'Virtual Color Wheel': 'Yes, 66 preset colors',
                        'Strobe': '1 – 25 Hz, random, pulse',
                        'Flower Effect': 'Beam shaper, ±60° rotation',
                        'Pan / Tilt': '540° / 230°, 16-bit',
                        'DMX Channels': '15 / 23 / 67 / 113',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN, W-DMX',
                        'Power': '850W, auto-switching 100-240V',
                        'Weight': '13.2 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '343 × 276 × 429 mm (head)',
                    }
                },
                {
                    id: 'robe-ledbeam150',
                    brand: 'Robe',
                    model: 'Robin LEDBeam 150',
                    category: 'LED Beam',
                    specs: {
                        'Source': '7 × 40W RGBW Multichip LEDs',
                        'Luminous Flux': '4,450 lm',
                        'Color Mixing': 'RGBW per pixel',
                        'Pixel Control': '7 individually controllable pixels',
                        'Zoom': '3.8° – 60°',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 230°, 16-bit',
                        'DMX Channels': '14 / 18 / 42',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN, W-DMX',
                        'Power': '350W, auto-switching 100-240V',
                        'Weight': '6.8 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '241 × 160 × 321 mm',
                    }
                },
                {
                    id: 'robe-t1',
                    brand: 'Robe',
                    model: 'Robin T1 Profile',
                    category: 'LED Profile',
                    specs: {
                        'Source': '468W white LED engine',
                        'Luminous Flux': '22,500 lm',
                        'CRI': '70+ / 90+ (high CRI mode)',
                        'Color Temperature': '6,700K (native)',
                        'CMY + CTO': 'Yes, continuous',
                        'Color Wheel': '7 dichroic filters + open',
                        'Gobos (Rotating)': '7 + open, rotating & indexable',
                        'Gobos (Static)': '7 + open',
                        'Animation Wheel': 'Yes',
                        'Framing System': '4-blade, each ±45° rotation, ±100% travel',
                        'Prism': '6-facet',
                        'Frost': '2 — light + heavy',
                        'Zoom': '7° – 49°',
                        'Iris': 'Motorized',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 280°, 16-bit',
                        'DMX Channels': '41 / 37 / 33',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN, W-DMX',
                        'Power': '680W, auto-switching 100-240V',
                        'Weight': '38.5 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '390 × 304 × 750 mm',
                    }
                },
                {
                    id: 'robe-bmfl',
                    brand: 'Robe',
                    model: 'BMFL Spot',
                    category: 'Moving Spot',
                    specs: {
                        'Source': '1,700W short-arc lamp',
                        'Luminous Flux': '58,000 lm',
                        'CRI': '75+',
                        'CMY + CTO + CTB': 'Yes, continuous',
                        'Color Wheel': '7 dichroic filters + open',
                        'Gobos (Rotating)': '9 + open, rotating & indexable',
                        'Gobos (Static)': '9 + open',
                        'Animation Wheel': 'Yes',
                        'Prism': '6-facet circular + 8-facet linear',
                        'Frost': '2 — light (1°) + medium (5°)',
                        'Zoom': '5° – 55°',
                        'Iris': 'Motorized',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 280°, 16-bit',
                        'DMX Channels': '42 / 38 / 33',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN, W-DMX',
                        'Power': '2,100W, auto-switching 200-240V',
                        'Weight': '39 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '425 × 350 × 780 mm',
                    }
                },
                {
                    id: 'robe-forte',
                    brand: 'Robe',
                    model: 'Robin Forte',
                    category: 'LED Moving Head',
                    specs: {
                        'Source': '750W TE LED engine',
                        'Luminous Flux': '37,000 lm',
                        'CRI': '70+ / 90+ (high CRI mode)',
                        'Color Temperature': '6,800K (native)',
                        'CMY + CTO': 'Yes, continuous',
                        'Color Wheel': '7 dichroic filters + open',
                        'Gobos (Rotating)': '7 + open, rotating & indexable',
                        'Gobos (Static)': '14 + open',
                        'Animation Wheel': 'Yes',
                        'Framing System': '4-blade, each ±45°, ±100% travel',
                        'Prism': '6-facet linear, rotating',
                        'Frost': '2 — light (1.5°) + heavy (5°)',
                        'Zoom': '5° – 50°',
                        'Iris': 'Motorized',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 280°, 16-bit',
                        'DMX Channels': '52 / 43 / 37',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN, W-DMX',
                        'Power': '1,050W, auto-switching 100-240V',
                        'Weight': '40 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '390 × 310 × 780 mm',
                    }
                },
                {
                    id: 'robe-esprite',
                    brand: 'Robe',
                    model: 'Robin Esprite',
                    category: 'LED Profile',
                    specs: {
                        'Source': '468W white LED engine',
                        'Luminous Flux': '22,000 lm',
                        'CRI': '70+ / 90+ (high CRI mode)',
                        'Color Temperature': '6,700K (native)',
                        'CMY + CTO': 'Yes, continuous',
                        'Color Wheel': '7 dichroic filters + open',
                        'Gobos (Rotating)': '7 + open, rotating & indexable',
                        'Gobos (Static)': '7 + open',
                        'Framing System': '4-blade, each ±45°',
                        'Prism': '6-facet rotating',
                        'Frost': '2 — light + heavy',
                        'Zoom': '7° – 49°',
                        'Iris': 'Motorized',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 280°, 16-bit',
                        'DMX Channels': '39 / 35 / 31',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN, W-DMX',
                        'Power': '680W, auto-switching 100-240V',
                        'Weight': '29.5 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '355 × 280 × 680 mm',
                    }
                },
                {
                    id: 'acme-pixeline',
                    brand: 'Acme',
                    model: 'CM-800Z II Pixeline',
                    category: 'LED Batten',
                    specs: {
                        'Source': '12 × 40W RGBW LEDs',
                        'Total Power': '500W',
                        'Luminous Flux': '8,700 lm',
                        'Color Mixing': 'RGBW per pixel',
                        'Pixel Control': '12 individually controllable segments',
                        'Beam Angle': '4° – 35° (zoom)',
                        'Tilt': '220° (motorized)',
                        'Strobe': '1 – 25 Hz',
                        'DMX Channels': '6 / 8 / 14 / 50',
                        'Protocol': 'DMX512, RDM',
                        'Power': '550W, 100-240V',
                        'Weight': '7.2 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '1045 × 180 × 130 mm',
                    }
                },
                {
                    id: 'acme-libra',
                    brand: 'Acme',
                    model: 'Libra',
                    category: 'LED Beam / Wash',
                    specs: {
                        'Source': '7 × 40W RGBW LEDs',
                        'Total Power': '300W',
                        'Luminous Flux': '3,500 lm',
                        'Color Mixing': 'RGBW per pixel',
                        'Pixel Control': '7 individual LEDs',
                        'Zoom': '4° – 60°',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 230°',
                        'DMX Channels': '16 / 18 / 40',
                        'Protocol': 'DMX512, RDM',
                        'Power': '350W, 100-240V',
                        'Weight': '7.5 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '290 × 195 × 380 mm',
                    }
                },
                {
                    id: 'chauvet-colorstrike',
                    brand: 'Chauvet',
                    model: 'Color STRIKE M',
                    category: 'LED Strobe / Wash',
                    specs: {
                        'Source': '72 × 3W CW LEDs + 4 × 40W RGBW LEDs (aura)',
                        'Total Power': '450W',
                        'Strobe Rate': '0 – 25 Hz',
                        'CW Output': '16,000 lm',
                        'RGBW Aura': 'Full color mixing',
                        'Beam Angle': '58° (CW) / 22° (aura)',
                        'Pixel Zones': '12 independently controllable zones',
                        'DMX Channels': '2 / 4 / 8 / 14 / 60',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN',
                        'Power': '500W, 100-240V',
                        'Weight': '6.8 kg',
                        'IP Rating': 'IP65',
                        'Dimensions': '430 × 190 × 132 mm',
                    }
                },
                {
                    id: 'martin-mac-aura-xb',
                    brand: 'Martin',
                    model: 'MAC Aura XB',
                    category: 'LED Wash',
                    specs: {
                        'Source': '19 × 30W RGBW LEDs (main) + 7 × RGB LEDs (aura)',
                        'Total Power': '580W',
                        'Luminous Flux': '12,600 lm',
                        'Color Mixing': 'RGBW (main), RGB (aura)',
                        'Zoom': '11° – 58°',
                        'Aura Effect': 'Full backlight ring, separately controllable',
                        'Pixel Mapping': '19 pixel zones',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 232°, 16-bit',
                        'DMX Channels': '14 / 17 / 91',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN',
                        'Power': '625W, 100-240V',
                        'Weight': '7.4 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '330 × 220 × 400 mm',
                    }
                },
                {
                    id: 'claypaky-sharpy-plus',
                    brand: 'Clay Paky',
                    model: 'Sharpy Plus',
                    category: 'Hybrid Beam/Spot',
                    specs: {
                        'Source': 'Osram Sirius HRI 330W X8',
                        'Luminous Flux': '11,200 lm',
                        'Color Wheel': '14 colors + open',
                        'Gobos (Rotating)': '6 + open, interchangeable',
                        'Gobos (Static)': '14 + open',
                        'Prism': '4-facet + 8-facet',
                        'Frost': '2 — light + heavy',
                        'Zoom': '2° – 44° (beam to spot)',
                        'Iris': 'Motorized',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 250°, 16-bit',
                        'DMX Channels': '24 / 29',
                        'Protocol': 'DMX512, RDM',
                        'Power': '500W, 200-240V',
                        'Weight': '19.7 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '350 × 265 × 598 mm',
                    }
                },
                {
                    id: 'glp-x5',
                    brand: 'GLP',
                    model: 'impression X5',
                    category: 'LED Wash',
                    specs: {
                        'Source': '19 × 30W RGBL LEDs',
                        'Total Power': '580W',
                        'Luminous Flux': '12,200 lm',
                        'Color Mixing': 'RGBL (Red, Green, Blue, Lime)',
                        'Zoom': '7° – 50°',
                        'Pixel Control': '19 individually addressable LEDs',
                        'Strobe': '1 – 25 Hz',
                        'Pan / Tilt': '540° / 220°, 16-bit',
                        'DMX Channels': '15 / 17 / 77',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN',
                        'Power': '650W, 100-240V',
                        'Weight': '9.2 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '330 × 210 × 420 mm',
                    }
                },
                {
                    id: 'atomic-3000',
                    brand: 'Martin',
                    model: 'Atomic 3000 LED',
                    category: 'LED Strobe',
                    specs: {
                        'Source': 'High-power white LED array + RGB aura backlight',
                        'Strobe Output': '3,000W equivalent',
                        'Strobe Rate': '1 – 25 Hz',
                        'Aura': 'Full RGB color mixing backlight',
                        'Beam Angle': '98°',
                        'FX Engine': 'Built-in, multiple effects',
                        'DMX Channels': '4 / 7 / 12',
                        'Protocol': 'DMX512, RDM, ArtNet, sACN',
                        'Power': '340W, 100-240V',
                        'Weight': '8.5 kg',
                        'IP Rating': 'IP20',
                        'Dimensions': '501 × 267 × 132 mm',
                    }
                },
                {
                    id: 'etc-source-four',
                    brand: 'ETC',
                    model: 'Source Four Ellipsoidal',
                    category: 'Ellipsoidal (Leko)',
                    specs: {
                        'Source': 'HPL 575W / 750W lamp',
                        'Luminous Flux': '14,500 lm (750W)',
                        'Color Temperature': '3,200K',
                        'Lens Options': '5°, 10°, 14°, 19°, 26°, 36°, 50°, 70°, 90°',
                        'Shutters': '4-blade, rotatable barrel',
                        'Gobo Slot': 'Size B',
                        'Pattern Holder': 'Standard A size, optional iris',
                        'DMX Channels': 'N/A (conventional) or 2 (w/ dimmer)',
                        'Power': '575W / 750W, 120V or 240V',
                        'Weight': '5.3 kg (without lens)',
                        'IP Rating': 'IP20',
                        'Connector': 'Stage pin / Edison / CEE',
                    }
                },
            ]
        },

        // ── LED SCREENS ────────────────────────────────────────────
        led_screens: {
            label: 'LED Screens',
            icon: 'fa-tv',
            items: [
                {
                    id: 'absen-polaris29',
                    brand: 'Absen',
                    model: 'Polaris 2.9 (PL2.9 Pro)',
                    category: 'Indoor LED Panel',
                    specs: {
                        'Pixel Pitch': '2.976 mm',
                        'Panel Resolution': '168 × 168 pixels',
                        'Panel Size': '500 × 500 × 80 mm',
                        'Panel Weight': '7.5 kg',
                        'LED Type': 'SMD 2020 (3-in-1)',
                        'Max Brightness': '1,200 nits',
                        'Refresh Rate': '3,840 Hz',
                        'Gray Scale': '16 bit',
                        'Contrast Ratio': '5,000:1',
                        'Viewing Angle': 'H 160° / V 140°',
                        'Processing': 'Novastar / Brompton compatible',
                        'Power (Max)': '210W per panel',
                        'Power (Avg)': '70W per panel',
                        'Input': 'Neutrik etherCON + powerCON TRUE1',
                        'IP Rating': 'IP31 (front)',
                        'Operating Temp': '-20°C to 45°C',
                        'Lifespan': '100,000 hours',
                        'Cabinets per m²': '4 panels',
                        'Pixel Density': '113,422 px/m²',
                        'Service Access': 'Front & rear',
                        'Curve Lock': '±15° per panel',
                    }
                },
                {
                    id: 'absen-polaris39',
                    brand: 'Absen',
                    model: 'Polaris 3.9 (PL3.9 Pro)',
                    category: 'Indoor / Outdoor LED Panel',
                    specs: {
                        'Pixel Pitch': '3.906 mm',
                        'Panel Resolution': '128 × 128 pixels',
                        'Panel Size': '500 × 500 × 80 mm',
                        'Panel Weight': '7.5 kg',
                        'LED Type': 'SMD 2727 (3-in-1)',
                        'Max Brightness': '5,000 nits (outdoor) / 1,200 nits (indoor)',
                        'Refresh Rate': '3,840 Hz',
                        'Gray Scale': '16 bit',
                        'Contrast Ratio': '5,000:1',
                        'Viewing Angle': 'H 160° / V 140°',
                        'Processing': 'Novastar / Brompton compatible',
                        'Power (Max)': '195W per panel',
                        'Power (Avg)': '65W per panel',
                        'Input': 'Neutrik etherCON + powerCON TRUE1',
                        'IP Rating': 'IP65 (front) / IP54 (rear)',
                        'Operating Temp': '-20°C to 45°C',
                        'Lifespan': '100,000 hours',
                        'Cabinets per m²': '4 panels',
                        'Pixel Density': '65,536 px/m²',
                        'Service Access': 'Front & rear',
                        'Curve Lock': '±15° per panel',
                    }
                },
            ]
        },

        // ── MEDIA SERVERS ──────────────────────────────────────────
        media_servers: {
            label: 'Media Servers & Processors',
            icon: 'fa-server',
            items: [
                {
                    id: 'hippo-borealis',
                    brand: 'Green Hippo',
                    model: 'Hippotizer Borealis+',
                    category: 'Media Server',
                    specs: {
                        'GPU': 'NVIDIA RTX A6000 (48GB VRAM)',
                        'CPU': 'Intel Xeon W or i9 series',
                        'RAM': '64 GB DDR4',
                        'Storage': '2 × 2TB NVMe SSD (RAID)',
                        'Max Outputs': '8 × DP 1.4 (via Datapath FX4)',
                        'Max Resolution': 'Up to 4K per output',
                        'Total Pixel Output': '35+ million pixels',
                        'Video Inputs': 'Optional Deltacast / Datapath capture cards',
                        'Codec Support': 'HAP, HAP-Q, HAP-Alpha, NotchLC, H.264, H.265, ProRes',
                        'Notch Integration': 'Yes — real-time generative content',
                        'Output Protocol': 'DVI / DP output, ArtNet, sACN, NDI',
                        'DMX Channels': '32+ universes via ArtNet / sACN',
                        'Control': 'DMX, ArtNet, sACN, OSC, CITP, proprietary ZooKeeper',
                        'Genlock': 'Via GPU or external sync',
                        'Network': '2 × 1GbE + optional 10GbE',
                        'OS': 'Windows (embedded)',
                        'Power': 'Redundant PSU, 850W',
                        'Form Factor': '4U rackmount',
                        'Weight': '~25 kg',
                    }
                },
                {
                    id: 'barco-e2',
                    brand: 'Barco',
                    model: 'E2 Event Master',
                    category: 'Video Processor / Switcher',
                    specs: {
                        'Processing': 'Uncompressed 4:4:4, 10-bit',
                        'Inputs': 'Up to 24 (modular — HDMI 2.0, DP 1.2, 12G-SDI, DVI, HDBaseT)',
                        'Outputs': 'Up to 16 (modular, same connector options)',
                        'Input Resolution': 'Up to 4K60 (4096 × 2160)',
                        'Output Resolution': 'Up to 4K60 (4096 × 2160)',
                        'Layers per Output': 'Up to 8 layers (PIP, key, background)',
                        'Scaling': 'Per-layer, full up/down/cross',
                        'Transitions': 'Cut, dissolve, wipe — per layer',
                        'Multiviewer': 'Up to 4 × multiviewer outputs (16 windows each)',
                        'Presets': 'Unlimited presets, instant recall',
                        'Screen Destinations': 'Up to 8 screen destinations',
                        'Aux Destinations': 'Up to 24',
                        'Background Sets': 'Multiple per screen',
                        'Genlock': 'Tri-level sync / blackburst input',
                        'Control': 'Ethernet (Event Master Toolbox), RS-232',
                        'Network': '2 × 1GbE (control + link)',
                        'Linking': 'Up to 4 × E2 linked for expanded I/O',
                        'Power': 'Dual redundant PSU, 1200W total',
                        'Form Factor': '4U rackmount',
                        'Weight': '26 kg',
                        'Dimensions': '483 × 178 × 559 mm',
                    }
                },
            ]
        },

        // ── TRUSS ──────────────────────────────────────────────────
        truss: {
            label: 'Truss',
            icon: 'fa-drafting-compass',
            items: [
                {
                    id: 'eurotruss-hd34',
                    brand: 'Eurotruss',
                    model: 'HD34',
                    category: 'Heavy Duty Box Truss',
                    specs: {
                        'Profile': '340 × 340 mm',
                        'Main Tubes': '50 × 3 mm (Ø)',
                        'Bracing Tubes': '25 × 2 mm (Ø)',
                        'Material': 'Aluminium 6082-T6',
                        'Weight': '9.8 kg/m',
                        'Max Load (centered, 12m span)': '450 kg',
                        'Max Load (UDL, 12m span)': '2,250 kg',
                        'Max Span (no load)': '18 m',
                        'Available Lengths': '0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0 m',
                        'Coupling': 'Conical coupling system (CCS)',
                        'Finish': 'Natural aluminium / Black powder coat',
                        'TÜV Certified': 'Yes',
                    }
                },
                {
                    id: 'eurotruss-fd34',
                    brand: 'Eurotruss',
                    model: 'FD34',
                    category: 'Folding Box Truss',
                    specs: {
                        'Profile': '340 × 340 mm',
                        'Main Tubes': '50 × 3 mm (Ø)',
                        'Bracing Tubes': '20 × 2 mm (Ø)',
                        'Material': 'Aluminium 6082-T6',
                        'Weight': '6.8 kg/m',
                        'Max Load (centered, 10m span)': '350 kg',
                        'Max Load (UDL, 10m span)': '1,500 kg',
                        'Max Span (no load)': '14 m',
                        'Available Lengths': '1.0, 1.5, 2.0, 2.5, 3.0, 4.0 m',
                        'Folded Height': '170 mm (transport)',
                        'Coupling': 'Conical coupling system (CCS)',
                        'Finish': 'Natural aluminium / Black powder coat',
                        'TÜV Certified': 'Yes',
                    }
                },
                {
                    id: 'eurotruss-xd',
                    brand: 'Eurotruss',
                    model: 'XD',
                    category: 'Extra Heavy Duty Box Truss',
                    specs: {
                        'Profile': '400 × 400 mm',
                        'Main Tubes': '50 × 4 mm (Ø)',
                        'Bracing Tubes': '25 × 2.5 mm (Ø)',
                        'Material': 'Aluminium 6082-T6',
                        'Weight': '12.5 kg/m',
                        'Max Load (centered, 15m span)': '600 kg',
                        'Max Load (UDL, 15m span)': '3,000 kg',
                        'Max Span (no load)': '22 m',
                        'Available Lengths': '1.0, 1.5, 2.0, 2.5, 3.0, 4.0 m',
                        'Coupling': 'Conical coupling system (CCS)',
                        'Finish': 'Natural aluminium / Black powder coat',
                        'TÜV Certified': 'Yes',
                    }
                },
                {
                    id: 'eurotruss-st',
                    brand: 'Eurotruss',
                    model: 'ST (Standard)',
                    category: 'Standard Box Truss',
                    specs: {
                        'Profile': '300 × 300 mm',
                        'Main Tubes': '50 × 2 mm (Ø)',
                        'Bracing Tubes': '20 × 2 mm (Ø)',
                        'Material': 'Aluminium 6082-T6',
                        'Weight': '5.0 kg/m',
                        'Max Load (centered, 8m span)': '200 kg',
                        'Max Load (UDL, 8m span)': '800 kg',
                        'Max Span (no load)': '12 m',
                        'Available Lengths': '0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0 m',
                        'Coupling': 'Conical coupling system (CCS)',
                        'Finish': 'Natural aluminium',
                        'TÜV Certified': 'Yes',
                    }
                },
            ]
        },

        // ── MOTORS ─────────────────────────────────────────────────
        motors: {
            label: 'Chain Hoists & Motors',
            icon: 'fa-cogs',
            items: [
                {
                    id: 'movecat-250',
                    brand: 'Movecat',
                    model: 'D8 Plus 250kg',
                    category: 'Electric Chain Hoist',
                    specs: {
                        'SWL': '250 kg',
                        'Lifting Speed': '4 m/min (single) / 8 m/min (double)',
                        'Chain': 'Grade 80, 5.6 × 17 mm',
                        'Chain Bag Capacity': '24 m standard',
                        'Brake': 'Electromagnetic fail-safe brake',
                        'Power': '0.75 kW motor, 400V 3-phase',
                        'Control': 'Direct or via Movecat I-Motion controller',
                        'Safety': 'Upper & lower limit switches, slip clutch',
                        'Noise Level': '<75 dB(A)',
                        'Weight (excl. chain)': '26 kg',
                        'Suspension': 'Standard Eurotruss half-coupler compatible',
                        'Certification': 'D8+ / BGV-C1 / DGUV',
                        'IP Rating': 'IP54',
                    }
                },
                {
                    id: 'movecat-500',
                    brand: 'Movecat',
                    model: 'D8 Plus 500kg',
                    category: 'Electric Chain Hoist',
                    specs: {
                        'SWL': '500 kg',
                        'Lifting Speed': '4 m/min (single) / 8 m/min (double)',
                        'Chain': 'Grade 80, 7.2 × 21 mm',
                        'Chain Bag Capacity': '24 m standard',
                        'Brake': 'Electromagnetic fail-safe brake',
                        'Power': '1.5 kW motor, 400V 3-phase',
                        'Control': 'Direct or via Movecat I-Motion controller',
                        'Safety': 'Upper & lower limit switches, slip clutch',
                        'Noise Level': '<75 dB(A)',
                        'Weight (excl. chain)': '38 kg',
                        'Suspension': 'Standard Eurotruss half-coupler compatible',
                        'Certification': 'D8+ / BGV-C1 / DGUV',
                        'IP Rating': 'IP54',
                    }
                },
                {
                    id: 'movecat-1000',
                    brand: 'Movecat',
                    model: 'D8 Plus 1000kg',
                    category: 'Electric Chain Hoist',
                    specs: {
                        'SWL': '1,000 kg',
                        'Lifting Speed': '2 m/min (single) / 4 m/min (double)',
                        'Chain': 'Grade 80, 10 × 30 mm, dual fall',
                        'Chain Bag Capacity': '24 m standard',
                        'Brake': 'Dual electromagnetic fail-safe brake',
                        'Power': '3.0 kW motor, 400V 3-phase',
                        'Control': 'Direct or via Movecat I-Motion controller',
                        'Safety': 'Upper & lower limit switches, slip clutch, load cell ready',
                        'Noise Level': '<78 dB(A)',
                        'Weight (excl. chain)': '65 kg',
                        'Suspension': 'Standard Eurotruss half-coupler compatible',
                        'Certification': 'D8+ / BGV-C1 / DGUV',
                        'IP Rating': 'IP54',
                    }
                },
            ]
        },

        // ── LIGHTING CONSOLES ──────────────────────────────────────
        consoles: {
            label: 'Lighting Consoles',
            icon: 'fa-sliders-h',
            items: [
                {
                    id: 'ma-grandma3-full',
                    brand: 'MA Lighting',
                    model: 'grandMA3 full-size',
                    category: 'Lighting Console',
                    specs: {
                        'DMX Parameters': '250,000+',
                        'DMX Universes': 'Up to 256 (with processing units)',
                        'Faders': '36 motorized faders (3 × 12)',
                        'Encoders': '15 dual encoders',
                        'Executor Buttons': '90',
                        'Displays': '2 × 15.6" Full HD capacitive touch + 2 × 9" command screens',
                        'Playbacks': 'Unlimited sequences, cues, presets',
                        'Processing': 'Integrated grandMA3 processing unit',
                        'Network': '2 × Gigabit Ethernet, MA-Net3',
                        'Protocol': 'DMX512, ArtNet, sACN, MA-Net3',
                        'External Screens': 'Up to 7 additional (via onPC / processing units)',
                        'MIDI': 'In / Out / Thru',
                        'Timecode': 'SMPTE / MIDI / Internal',
                        'Audio Input': 'Yes, for sound-to-light',
                        'USB': '6 × USB 3.0',
                        'UPS': 'Integrated (hot-swap battery)',
                        'Power': '100-240V AC, ~200W',
                        'Weight': '55 kg',
                        'Dimensions': '1,403 × 647 × 280 mm',
                    }
                },
                {
                    id: 'ma-grandma3-light',
                    brand: 'MA Lighting',
                    model: 'grandMA3 light',
                    category: 'Lighting Console',
                    specs: {
                        'DMX Parameters': '250,000+',
                        'DMX Universes': 'Up to 256 (with processing units)',
                        'Faders': '24 motorized faders (2 × 12)',
                        'Encoders': '10 dual encoders',
                        'Executor Buttons': '60',
                        'Displays': '2 × 15.6" Full HD capacitive touch + 1 × 9" command screen',
                        'Playbacks': 'Unlimited',
                        'Processing': 'Integrated grandMA3 processing unit',
                        'Network': '2 × Gigabit Ethernet, MA-Net3',
                        'Protocol': 'DMX512, ArtNet, sACN, MA-Net3',
                        'MIDI': 'In / Out / Thru',
                        'Timecode': 'SMPTE / MIDI / Internal',
                        'UPS': 'Integrated',
                        'Power': '100-240V AC, ~180W',
                        'Weight': '42 kg',
                        'Dimensions': '1,083 × 647 × 280 mm',
                    }
                },
                {
                    id: 'ma-grandma3-compact',
                    brand: 'MA Lighting',
                    model: 'grandMA3 compact XT',
                    category: 'Lighting Console',
                    specs: {
                        'DMX Parameters': '250,000+',
                        'DMX Universes': 'Up to 256 (with processing units)',
                        'Faders': '12 motorized faders',
                        'Encoders': '6 dual encoders',
                        'Executor Buttons': '30',
                        'Displays': '1 × 15.6" Full HD capacitive touch + 1 × 9" command screen',
                        'Playbacks': 'Unlimited',
                        'Processing': 'Integrated grandMA3 processing unit',
                        'Network': '2 × Gigabit Ethernet, MA-Net3',
                        'Protocol': 'DMX512, ArtNet, sACN, MA-Net3',
                        'MIDI': 'In / Out',
                        'Timecode': 'SMPTE / MIDI / Internal',
                        'UPS': 'Integrated',
                        'Power': '100-240V AC, ~150W',
                        'Weight': '28 kg',
                        'Dimensions': '740 × 647 × 280 mm',
                    }
                },
                {
                    id: 'chamsys-mv',
                    brand: 'ChamSys',
                    model: 'MagicQ MQ500M Stadium',
                    category: 'Lighting Console',
                    specs: {
                        'DMX Universes': '256 direct (built-in)',
                        'Faders': '30 motorized playback faders',
                        'Encoders': '8 rotary encoders',
                        'Displays': '3 × 15.6" multi-touch (built-in)',
                        'Playbacks': 'Unlimited cue stacks',
                        'Processing': 'Quad-core Intel i7',
                        'Network': '4 × Gigabit Ethernet',
                        'Protocol': 'DMX512, ArtNet, sACN, ACN',
                        'MIDI': 'In / Out',
                        'Timecode': 'LTC / MIDI',
                        'Audio Input': 'Yes',
                        'USB': '4 × USB 3.0',
                        'UPS': 'Integrated',
                        'Power': '100-240V AC',
                        'Weight': '45 kg',
                    }
                },
            ]
        },

        // ── AUDIO MIXERS ──────────────────────────────────────────
        mixers: {
            label: 'Audio Mixers',
            icon: 'fa-volume-up',
            items: [
                {
                    id: 'yamaha-cl5',
                    brand: 'Yamaha',
                    model: 'CL5',
                    category: 'Digital Mixing Console',
                    specs: {
                        'Input Channels': '72 mono + 8 stereo (mix)',
                        'Mix Buses': '24 Mix + 8 Matrix',
                        'Faders': '72 (3 × 24 + master)',
                        'Sampling Rate': '96 kHz (internal)',
                        'Bit Depth': '24-bit / 32-bit float (processing)',
                        'Touch Screen': '12.1" TFT color, touch-enabled',
                        'Stage Boxes': 'Dante — up to 8 × Rio3224-D2 (256 in / 256 out)',
                        'Dante Channels': '64 in / 64 out (internal)',
                        'Effects': '16 × built-in Premium Rack effects',
                        'GEQ': '24 × 31-band GEQ',
                        'Recall Safe': 'Per-channel / global',
                        'Protocol': 'Dante, MADI (option), AES/EBU',
                        'Network': '3 × Gigabit Ethernet (Dante primary/secondary + control)',
                        'MIDI': 'In / Out',
                        'USB Recording': 'Yes, 2-track',
                        'Power': '100-240V AC, 250W',
                        'Weight': '42 kg',
                        'Dimensions': '1,413 × 623 × 289 mm',
                    }
                },
                {
                    id: 'yamaha-rivage-pm7',
                    brand: 'Yamaha',
                    model: 'RIVAGE PM7',
                    category: 'Digital Mixing Console',
                    specs: {
                        'Input Channels': '120 (mono)',
                        'Mix Buses': '48 Mix + 24 Matrix',
                        'Faders': 'CSD-R7 surface — 38 faders (3 bays)',
                        'Sampling Rate': '96 kHz',
                        'Bit Depth': '32-bit float',
                        'Touch Screens': '2 × 12.1" capacitive touch',
                        'DSP Engine': 'Dedicated RPio622 / TWINLANe network',
                        'I/O': 'Up to 400+ via TWINLANe / Dante',
                        'Effects': '24 × premium plug-in effects',
                        'GEQ': '48 × 31-band',
                        'Protocol': 'Dante, TWINLANe, MADI, AES/EBU',
                        'Network': 'TWINLANe + Dante + Ethernet control',
                        'MIDI': 'In / Out',
                        'Power': '100-240V AC, 300W',
                        'Weight': '52 kg (surface)',
                    }
                },
                {
                    id: 'digico-sd12',
                    brand: 'DiGiCo',
                    model: 'SD12',
                    category: 'Digital Mixing Console',
                    specs: {
                        'Input Channels': '72',
                        'Buses': '36 (configurable aux/group/matrix)',
                        'Faders': '24 (2 × 12, motorized 100mm)',
                        'Sampling Rate': '96 kHz',
                        'Touch Screen': '15" capacitive multi-touch',
                        'Processing': 'Super FPGA, floating point',
                        'Stage Box': 'Optocore — SD-Rack, SD-MiNi Rack',
                        'Effects': '12 × built-in dynamic EQ, multiband compressors',
                        'Protocol': 'Optocore, MADI, Dante (option), AES/EBU',
                        'Network': 'Optocore fiber (loop), Gigabit Ethernet',
                        'MIDI': 'In / Out',
                        'USB': 'Recording & playback',
                        'Power': '100-240V AC, external PSU',
                        'Weight': '22 kg',
                        'Dimensions': '917 × 596 × 225 mm',
                    }
                },
                {
                    id: 'allen-heath-dlive',
                    brand: 'Allen & Heath',
                    model: 'dLive S7000',
                    category: 'Digital Mixing Console',
                    specs: {
                        'Input Channels': '128',
                        'Mix Buses': '64',
                        'Faders': '36 (3 × 12, motorized)',
                        'Sampling Rate': '96 kHz',
                        'Touch Screen': '12" capacitive multi-touch',
                        'Processing': 'XCVI 128-bit FPGA core',
                        'I/O System': 'DX32 / gigaACE / Dante / Waves SG',
                        'Effects': '16 × DEEP processing compressors + 16 RackFX',
                        'Protocol': 'Dante, gigaACE, MADI (option), AES/EBU',
                        'Network': 'gigaACE + Ethernet control',
                        'MIDI': 'In / Out',
                        'USB': 'Multitrack (128 × 128)',
                        'Power': '100-240V AC, redundant PSU option',
                        'Weight': '46 kg',
                        'Dimensions': '1,301 × 725 × 310 mm',
                    }
                },
            ]
        },
    },

    // ================================================================
    // RENDER
    // ================================================================

    render() {
        return `
        <div class="spec-page">
            <div class="spec-toolbar">
                <div class="spec-search-wrap">
                    <i class="fas fa-search"></i>
                    <input type="text" id="spec-search" class="spec-search"
                           placeholder="Search equipment..."
                           oninput="SpecificationsPage._onSearch(this.value)">
                </div>
                <div class="spec-categories" id="spec-categories">
                    <button class="spec-cat-btn active" data-cat="all" onclick="SpecificationsPage._filterCat('all')">
                        <i class="fas fa-layer-group"></i> All
                    </button>
                    ${Object.entries(this._equipment).map(([key, cat]) => `
                        <button class="spec-cat-btn" data-cat="${key}" onclick="SpecificationsPage._filterCat('${key}')">
                            <i class="fas ${cat.icon}"></i> ${cat.label}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="spec-grid" id="spec-grid">
                ${this._renderGrid()}
            </div>
        </div>`;
    },

    onActivate() {
        this._activeCategory = 'all';
        this._searchTerm = '';
        this._expandedItems = new Set();
    },

    onDeactivate() {},

    // ================================================================
    // FILTERING
    // ================================================================

    _filterCat(cat) {
        this._activeCategory = cat;
        document.querySelectorAll('.spec-cat-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.cat === cat));
        this._refresh();
    },

    _onSearch(val) {
        this._searchTerm = val.trim().toLowerCase();
        this._refresh();
    },

    _refresh() {
        const grid = document.getElementById('spec-grid');
        if (grid) grid.innerHTML = this._renderGrid();
    },

    // ================================================================
    // GRID RENDER
    // ================================================================

    _renderGrid() {
        const search = this._searchTerm;
        let html = '';
        let count = 0;

        for (const [catKey, cat] of Object.entries(this._equipment)) {
            if (this._activeCategory !== 'all' && this._activeCategory !== catKey) continue;

            const filtered = cat.items.filter(item => {
                if (!search) return true;
                const hay = `${item.brand} ${item.model} ${item.category} ${Object.values(item.specs).join(' ')}`.toLowerCase();
                return hay.includes(search);
            });

            if (filtered.length === 0) continue;

            html += `<div class="spec-section">
                <h2 class="spec-section-title"><i class="fas ${cat.icon}"></i> ${cat.label}</h2>
                <div class="spec-cards">`;

            for (const item of filtered) {
                const expanded = this._expandedItems.has(item.id);
                const specEntries = Object.entries(item.specs);
                const preview = specEntries.slice(0, 5);
                const rest = specEntries.slice(5);

                html += `
                <div class="spec-card ${expanded ? 'expanded' : ''}" id="spec-card-${item.id}">
                    <div class="spec-card-header" onclick="SpecificationsPage._toggle('${item.id}')">
                        <div class="spec-card-title">
                            <span class="spec-brand">${UI.esc(item.brand)}</span>
                            <span class="spec-model">${UI.esc(item.model)}</span>
                        </div>
                        <span class="spec-category-badge">${UI.esc(item.category)}</span>
                        <i class="fas fa-chevron-down spec-toggle-icon"></i>
                    </div>
                    <div class="spec-card-body">
                        <table class="spec-table">
                            ${preview.map(([k, v]) => `<tr><td class="spec-key">${UI.esc(k)}</td><td class="spec-val">${UI.esc(v)}</td></tr>`).join('')}
                            ${rest.length ? (expanded
                                ? rest.map(([k, v]) => `<tr><td class="spec-key">${UI.esc(k)}</td><td class="spec-val">${UI.esc(v)}</td></tr>`).join('')
                                : `<tr class="spec-more-row"><td colspan="2"><button class="spec-more-btn" onclick="event.stopPropagation();SpecificationsPage._toggle('${item.id}')">Show ${rest.length} more specs...</button></td></tr>`
                            ) : ''}
                        </table>
                    </div>
                </div>`;
                count++;
            }

            html += `</div></div>`;
        }

        if (count === 0) {
            html = `<div class="spec-empty"><i class="fas fa-search"></i><p>No equipment matches your search.</p></div>`;
        }

        return html;
    },

    _toggle(id) {
        if (this._expandedItems.has(id)) {
            this._expandedItems.delete(id);
        } else {
            this._expandedItems.add(id);
        }
        this._refresh();
    },
};
