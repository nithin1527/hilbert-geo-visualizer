// canvas/canvas.js
import { ConvexPolygon, Point, SelectableSegment, HilbertBall } from "../../default-objects.js";
import { drawInfoBox, clearInfoBoxes, renderAllKaTeX, hidePiGradientBar, createPiMap, createScatterPlot, createPointPiMap, graphPerimBalls } from "../../default-functions.js";
import { initEvents } from "./canvas-events.js";

export class Canvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');

        const dpr = window.devicePixelRatio;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.dpr = dpr;

        this.polygon = new ConvexPolygon();
        this.mode = 'Convex';
        this.selectedProgram = 'Site';
        initEvents(this);
        this.activeManager = 'SiteManager';
        this.hilbertDistanceManager = null;

        this.polygonType = 'freeDraw';
        this.canvasWidth = 1500;
        this.canvasHeight = 850;

        this.customNgonInput = document.getElementById('customNgonInput');
        this.createCustomNgonButton = document.getElementById('createCustomNgon');

        this.ngonVertices = [];
        this.sites = [];
        this.selectionOrder = [];
        this.segments = [];
        this.bisectors = [];
        this.zRegions = [];
        this.perimPoints = [];
    }
    
    setPolygonType(type) {
        this.polygonType = type;
        if (type === 'customNgon') {
            const n = parseInt(this.customNgonInput.value);
            if (n >= 3) {
                this.createNgon(n);
            } else {
                alert('Please enter a number greater than or equal to 3.');
                return;
            }
        } else if (type !== 'freeDraw') {
            this.createNgon(parseInt(type));
        } else {
            this.resetCanvas();
        }
        this.sites = this.sites.filter(site => this.polygon.contains(site));
        this.sites.forEach(site => {
            site.setPolygon(this.polygon);
            site.computeSpokes();
            site.computeHilbertBall?.();
        });
        this.drawAll();
    }
    
    createNgon(n) {
        const centerX = this.canvasWidth / 2.5;
        const centerY = this.canvasHeight / 2;
        const radius = Math.min(this.canvasWidth, this.canvasHeight) * 0.4; // 40% of the smaller dimension
        
        this.polygon = new ConvexPolygon();
        
        for (let i = 0; i < n; i++) {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle) / 2;
            const y = centerY + radius * Math.sin(angle) / 2;
            this.polygon.addVertex(new Point(x + 1, y - 1));
        }
    
        this.updateShowHeatMapVis();
    }

    updateShowHeatMapVis() {
        const showPiHeatMapBtn = document.getElementById('showPiHeatMapBtn');
        showPiHeatMapBtn.style.display = this.polygon.vertices.length > 2 ? 'block' : 'none';

        const showPointPiHeatMapBtn = document.getElementById('showPointPiHeatMapBtn');
        showPointPiHeatMapBtn.style.display = this.polygon.vertices.length > 2 && this.sites.length == 1 ? 'block' : 'none';

        const showGraphPerimBalls = document.getElementById('showGraphPerimBalls');
        showGraphPerimBalls.style.display = this.polygon.vertices.length > 2 && this.sites.length == 1 ? 'block' : 'none';
    }

    setHilbertDistanceManager(hilbertDistanceManager) {
        this.hilbertDistanceManager = hilbertDistanceManager;
    }

    getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    addPolygonPoint(event) {
        if (this.polygonType === 'freeDraw') {
            const { x, y } = this.getMousePos(event);
            this.polygon.addVertex(new Point(x, y));
            this.polygon.showInfo = document.getElementById('polygonShowInfo').checked;
            this.updateShowHeatMapVis();
            this.drawAll();
        }
    }
    
    calculateCenter(points) {
        const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        return new Point(x, y);
    }
    
    calculateRadius(center, points) {
        return Math.max(...points.map(p => 
            Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2))
        ));
    }

    setPolygonColor(event) {
        this.polygon.setColor(event.target.value);
        this.drawAll();
    }

    setPolygonShowInfo(event) {
        this.polygon.setShowInfo(event.target.checked);
        this.drawAll();
    }

    setPolygonShowDiagonals(event) {
        this.polygon.setShowDiagonals(event.target.checked);
        this.drawAll();
    }

    addBisector(bisector) {
        this.bisectors.push(bisector);
        this.drawAll();
    }

    drawPiMap() {
        if (this.polygon.vertices.length > 2) {
            let stepSize;
            let isValidInput = false;
    
            while (!isValidInput) {
                stepSize = prompt("Enter a step size for level curves or 0 for the full heat map");
    
                if (stepSize === null) {
                    return;
                } else if (stepSize === "" || isNaN(Number(stepSize))) {
                    alert("Please enter a valid number.");
                } else {
                    isValidInput = true;
                    stepSize = Number(stepSize);
                }
            }

            let radius = prompt("Enter a Hilbert Ball Radius");
            if (radius === null) {
                return;
            } else if (radius === "" || isNaN(Number(radius))) {
                alert("Please enter a valid number.");
            } else {
                if (Number(radius > 0)) {
                    isValidInput = true;
                    radius = Number(radius);
                } else {
                    alert("Please enter a valid radius.");
                }
            }
    
            if (stepSize > 0) {
                createPiMap(this.ctx, 1, this.polygon, stepSize, radius);
            } else {
                createPiMap(this.ctx, 1, this.polygon, -1, radius);
            }
        } else {
            alert('Polygon must have 3 or more vertices');
        }
    }

    drawPointPiMap() {
        if (this.polygon.vertices.length > 2 && this.sites.length == 1) {
            let stepSize;
            let isValidInput = false;
    
            while (!isValidInput) {
                stepSize = prompt("Enter a step size for level curves or 0 for the full heat map");
    
                if (stepSize === null) {
                    return;
                } else if (stepSize === "" || isNaN(Number(stepSize))) {
                    alert("Please enter a valid number.");
                } else {
                    isValidInput = true;
                    stepSize = Number(stepSize);
                }
            }
    
            if (stepSize > 0) {
                createPointPiMap(this.ctx, 1, this.polygon, stepSize, this.sites[0]);
            } else {
                createPointPiMap(this.ctx, 1, this.polygon, -1, this.sites[0]);
            }
        } else {
            alert('Polygon must have 3 or more vertices');
        }
    }

    graphPerimBalls() {
        if (this.polygon.vertices.length > 2 && this.sites.length == 1) {
            let perim = prompt("Enter a perimeter value");
            graphPerimBalls(this.ctx, 1.5, this.polygon, this.sites[0], this, perim);
        } else {
            alert('Polygon must have 3 or more vertices');
        }
    }

    drawSegments() {
        this.segments.forEach(segment => {
            segment.draw(this.ctx);
        });
    }   

    drawAll() {
        this.updateShowHeatMapVis();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.polygon.draw(this.ctx);

        if (this.perimPoints.length > 0) {
            this.perimPoints.forEach(pt => { pt.draw(this.ctx); })
        }

        this.sites.forEach(site => {
            site.computeSpokes();
            site.computeHilbertBall?.();
            site.draw(this.ctx);
        });

        this.bisectors.forEach(bisector => {
            bisector.computeBisector(bisector.s1, bisector.s2);
            bisector.draw(this.ctx);
        }); 

        this.zRegions.forEach(zRegion => {
            zRegion.computeZRegion();
            zRegion.draw(this.ctx);
        });

        this.drawSegments();

        /* ------------------------------------------------------------------------------------------------ */

        clearInfoBoxes();

        if (this.polygon.showInfo) {
            this.polygon.vertices.forEach(vertex => {
                if (vertex.showInfo) drawInfoBox(vertex, this.canvas, this.dpr);
            });
        }

        this.sites.forEach(site => { if (site.showInfo) drawInfoBox(site, this.canvas, this.dpr); });

        renderAllKaTeX();
    }

    resetCanvas() {
        this.sites = [];
        this.segments = [];
        this.bisectors = [];
        this.ngonVertices = [];
        this.perimPoints = [];
        this.polygon = new ConvexPolygon([], this.polygon.color, this.polygon.penWidth, this.polygon.showInfo, this.polygon.showVertices, this.polygon.vertexRadius);

        if (this.hilbertDistanceManager) {
            this.hilbertDistanceManager.resetLabels();
        }
        
        hidePiGradientBar();

        this.updateShowHeatMapVis();

        this.polygonType = 'freeDraw';
        document.querySelector('input[name="polygonType"][value="freeDraw"]').checked = true;

        this.drawAll();
    }
}