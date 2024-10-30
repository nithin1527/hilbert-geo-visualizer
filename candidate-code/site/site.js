import { Site, Point, SelectableSegment, HilbertBall } from "../../default-objects.js";
import { 
    initMouseActions, 
    initProperties, 
    initShortcuts, 
    initLabelInput,
    initContextMenu
} from "./site-events.js";
import { mouseOnSite, hidePiGradientBar } from "../../default-functions.js";

export class SiteManager {
    constructor(canvas, hilbertDistanceManager, bisectorManager, zRegionManager) {
        this.canvas = canvas;
        this.isDragging = false;
        this.active = false;
        this.name = "SiteManager";
        this.isDragSelecting = false;
        this.dragSelectModeActive = false;
        this.hilbertDistanceManager = hilbertDistanceManager;
        this.bisectorManager = bisectorManager;
        this.zRegionManager = zRegionManager;
        initMouseActions(this);
        initProperties(this);
        initShortcuts(this);
        initLabelInput(this);
        initContextMenu(this);
    }

    addSite(event, xInput = null, yInput = null) {
        let x, y;
        if (xInput !== null && yInput !== null) {
            x = xInput;
            y = yInput;
        } else {
            ({ x, y } = this.canvas.getMousePos(event));
        }

        if (this.canvas.polygon.contains(new Point(x, y))) {
            const newSite = new Site(x, y, this.canvas.polygon);
            this.assignSiteProperties(newSite);
            this.prioritize(newSite);
            this.canvas.sites.push(newSite);
            this.drawAll();
        }
    }

    removeSite() {
        this.canvas.sites = this.canvas.sites.filter(site => {
            if (site.selected) {
                this.hilbertDistanceManager.deleteSite(site);
                if (site instanceof HilbertBall) {
                    this.canvas.segments = this.canvas.segments.filter(segment => !site.polygon.segments.includes(segment)); 
                }
                return false;
            }
            return true;
        });
        this.canvas.bisectors = this.canvas.bisectors.filter(bisector => {
            if (bisector.s1.selected || bisector.s2.selected) {
                return false;
            }
            return true;
        });
        this.hilbertDistanceManager.hideDistanceCard();
        this.setPositionText("N/A");
        this.setLabelText("");
        this.drawAll();
    }

    updateSiteProperties(site) {
        document.getElementById('siteColor').value = site.color;
        document.getElementById('siteShowInfo').checked = site.showInfo;
        document.getElementById('siteDrawSpokes').checked = site.drawSpokes;
        document.getElementById('labelInput').value = site.label;
        document.getElementById('labelInput').style.color = site.color;
        this.setPositionText(site);
    }

    assignSiteProperties(site) {
        site.color = document.getElementById('siteColor').value;
        site.showInfo = document.getElementById('siteShowInfo').checked;
        site.drawSpokes = document.getElementById('siteDrawSpokes').checked;
        site.label = document.getElementById('labelInput').value;
        this.updateSiteProperties(site);
    }

    prioritize(site) {
        this.deselectAllSites();
        if (!this.canvas.selectionOrder.includes(site)) {
            this.canvas.selectionOrder.push(site);
        }
        site.setSelected(true);
    }

    selectSite(event, multiple = false) {
        const { x, y } = this.canvas.getMousePos(event);
        let siteSelected = false;
        const sitesPreviouslySelected = this.canvas.sites.some(site => site.selected); // Check if any sites were previously selected
    
        this.canvas.sites.forEach(site => {
            if (mouseOnSite({ x, y }, site)) {
                if (multiple) {
                    if (!site.selected) {
                        site.setSelected(true);
                        this.canvas.selectionOrder.push(site);
                    }
                } else {
                    this.deselectAllSites();
                    site.setSelected(true);
                    this.canvas.selectionOrder = [site];
                }
                siteSelected = true;
                this.updateSiteProperties(site);
            }
        });
    
        if (!(this.canvas.activeManager === 'HilbertDistanceManager')) {
            this.hilbertDistanceManager.hideDistanceCard();
        }
    
        if (multiple) {
            this.setDefaultValuesForMultiple(); 
            this.canvas.drawAll();
            return;
        } else if (!siteSelected) {
            this.deselectAllSites();
            this.setPositionText("N/A");
            if (sitesPreviouslySelected) this.setLabelText("");
        }
    
        this.canvas.drawAll();
    }

    deselectAllSites() {
        this.canvas.sites.forEach(site => site.setSelected(false));
        this.canvas.selectionOrder = [];
        this.hilbertDistanceManager.hideDistanceCard();
    }

    startDragging(event) {
        const { x, y } = this.canvas.getMousePos(event);
        this.canvas.sites.forEach(site => {
            if (mouseOnSite({ x, y }, site)) {
                if (!event.shiftKey) {
                    this.prioritize(site);
                    this.isDragging = true;
                }
                this.updateSiteProperties(site);
                return;
            }
        });
    }

    dragSite(event) {
        if (this.isDragging) {
            const rect = this.canvas.canvas.getBoundingClientRect();
            const { x, y } = this.canvas.getMousePos(event);
            if (this.canvas.polygon.contains(new Point(x, y))) {
                const selectedSite = this.canvas.sites.find(site => site.selected);
                if (selectedSite) {
                    const deltaX = x - selectedSite.x;
                    const deltaY = y - selectedSite.y;
                    selectedSite.x = x;
                    selectedSite.y = y;

                    selectedSite.computeSpokes();
                    
                    if (selectedSite instanceof HilbertBall) {
                        this.removeBallSegments(selectedSite);
                        selectedSite.computeHilbertBall();
                    }

                    if (selectedSite.infoBoxPosition) {
                        selectedSite.infoBoxPosition.left += deltaX * (rect.width / (this.canvas.canvas.width / this.canvas.dpr));
                        selectedSite.infoBoxPosition.top += deltaY * (rect.height / (this.canvas.canvas.height / this.canvas.dpr));
                    }
    
                    this.updateSiteProperties(selectedSite);
                    this.canvas.drawAll();
                }
            }
        }
    }

    removeBallSegments(ball) {
        this.canvas.segments = this.canvas.segments.filter(segment => !ball.polygon.segments.includes(segment)); 
    }

    stopDragging() {
        this.isDragging = false;
    }

    startDragSelect(event) {
        this.isDragSelecting = true;
        this.dragStart = this.canvas.getMousePos(event);
        this.dragEnd = this.dragStart;
    }

    updateDragSelect(event) {
        this.dragEnd = this.canvas.getMousePos(event);
        this.drawAll();
    }

    endDragSelect(event) {
        this.isDragSelecting = false;
        this.dragEnd = this.canvas.getMousePos(event);
        this.dragSelectModeActive = true;
        this.selectSitesInDragBox();
        this.dragSelectModeActive = false;
        this.drawAll();
    }

    drawSelectionBox() {
        const { x: x1, y: y1 } = this.dragStart;
        const { x: x2, y: y2 } = this.dragEnd;
        const ctx = this.canvas.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.restore();
    }

    selectSitesInDragBox() {
        const { x: x1, y: y1 } = this.dragStart;
        const { x: x2, y: y2 } = this.dragEnd;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        this.canvas.sites.forEach(site => {
            if (site.x >= minX && site.x <= maxX && site.y >= minY && site.y <= maxY) {
                site.setSelected(true);
                this.canvas.selectionOrder.push(site);
            }
        });

        // this.canvas.segments.forEach(segment => {
        //     if (!segment.belongsToBallBoundary && segment.isWithinSelectionBox(minX, minY, maxX, maxY)) {
        //         segment.setSelected(true);
        //     }
        // });

        this.setDefaultValuesForMultiple(); 
        this.drawAll();
    }

    drawAll() {
        this.canvas.drawAll();
        if (this.isDragSelecting) {
            this.drawSelectionBox();
        }
    }

    activate() {
        this.active = true;
    }

    deactivate() {
        this.active = false;
    }

    setPositionText(site) {
        let textElement = document.getElementById('sitePosition');
        if (site === 'N/A') {
            const text = `\\text{N/A}`;
            katex.render(text, textElement, {
                throwOnError: false
            });
        } else {
            const text = `(${site.x.toFixed(0)}, ${site.y.toFixed(0)})`;
            katex.render(text, textElement, {
                throwOnError: false
            });
        }
    }

    setLabelText(text) {
        document.getElementById('labelInput').value = text;
    }

    checkTwoSitesSelected() {
        const selectedSites = this.canvas.sites.filter(site => site.selected);
        return selectedSites.length === 2;
    }

    checkThreeSitesSelected() {
        const selectedSites = this.canvas.sites.filter(site => site.selected);
        return selectedSites.length === 3;
    }

    checkOneSiteSelected() {
        const selectedSites = this.canvas.sites.filter(site => site.selected);
        return selectedSites.length === 1;
    }

    checkAnySelected() {
        const selectedSites = this.canvas.sites.filter(site => site.selected);
        return selectedSites.length > 0;
    }

    checkOneSegmentSelected() {
        const selectedSegments = this.canvas.segments.filter(segment => 
            segment instanceof SelectableSegment && segment.selected
        );
        return selectedSegments.length === 1;
    }

    getSelectedSegment() {
        return this.canvas.segments.filter(segment => segment.selected)[0];
    }

    getSelectedSegments() {
        return this.canvas.segments.filter(segment => segment.selected);
    }

    getSelectedSites() {
        return this.canvas.selectionOrder;
    }

    getSiteSelected() {
        const selectedSites = this.canvas.sites.filter(site => site.selected);
        if (selectedSites.length === 1) {
            return selectedSites[0];
        } else {
            return null;
        }
    }

    drawSegment() {
        const selectedSites = this.getSelectedSites();
        if (selectedSites.length === 2) {
            const segmentColor = 'black';
            const segment = new SelectableSegment(selectedSites[0], selectedSites[1], segmentColor);
            this.canvas.segments.push(segment);
            this.canvas.drawAll();
        }
    }

    removeSelectedSegment() {
        this.canvas.segments = this.canvas.segments.filter(segment => !segment.selected);
        this.canvas.drawAll();
    }

    selectSegment(point) {
        this.canvas.segments.forEach(segment => {
            if (segment.containsPoint(point)) { 
                segment.setSelected(true);
                this.deselectAllSites();
            } else {
                segment.setSelected(false);
            }
        });
        this.canvas.drawAll();
    }

    deselectAllSegments() {
        this.canvas.segments.forEach(segment => segment.setSelected(false));
        this.canvas.drawAll();
    }

    // Inside SiteManager class in site.js
    setDefaultValuesForMultiple() {
        const selectedSites = this.getSelectedSites();
        if (selectedSites.length > 1) {
            const siteColor = document.getElementById('siteColor');
            const siteShowInfo = document.getElementById('siteShowInfo');
            const siteDrawSpokes = document.getElementById('siteDrawSpokes');
            const labelInput = document.getElementById('labelInput');

            const commonColor = selectedSites[0].color;
            const allSameColor = selectedSites.every(site => site.color === commonColor);
            if (allSameColor) {
                siteColor.defaultValue = commonColor;
                siteColor.value = commonColor;
            } else {
                siteColor.defaultValue = '#0000FF';
                siteColor.value = '#0000FF';
            }

            const commonShowInfo = selectedSites[0].showInfo;
            const allSameShowInfo = selectedSites.every(site => site.showInfo === commonShowInfo);
            if (allSameShowInfo) {
                siteShowInfo.defaultChecked = commonShowInfo;
                siteShowInfo.checked = commonShowInfo;
            } else {
                siteShowInfo.checked = false;
                siteShowInfo.defaultChecked = false;
            }

            const commonDrawSpokes = selectedSites[0].drawSpokes;
            const allSameDrawSpokes = selectedSites.every(site => site.drawSpokes === commonDrawSpokes);
            if (allSameDrawSpokes) {
                siteDrawSpokes.defaultChecked = commonDrawSpokes;
                siteDrawSpokes.checked = commonDrawSpokes;
            } else {
                siteDrawSpokes.checked = false;
                siteDrawSpokes.defaultChecked = false;
            }

            const commonLabel = selectedSites[0].label;
            const allSameLabel = selectedSites.every(site => site.label === commonLabel);
            if (allSameLabel) {
                labelInput.defaultValue = commonLabel;
                labelInput.value = commonLabel;
            } else {
                labelInput.value = '';
                labelInput.defaultValue = '';
            }
        }
    }
}