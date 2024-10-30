import { Bisector, MiddleSector, Pierogi, ZRegion } from "../../default-objects.js";

export class ZRegionManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.name = 'ZRegionManager';
        this.selectedSites = [];
        this.savedZRegions = [];
    }

    setSiteManager(siteManager) {
        this.siteManager = siteManager;
    }   

    test() {
        let ctx = this.canvas.ctx;
        let middleSector = new MiddleSector(this.s1, this.s2, this.canvas.polygon);
        let bisector = new Bisector(middleSector, ctx);
        bisector.draw(ctx);
    }

    createZRegion(s1, s2) {
        let middleSector = new MiddleSector(s1, s2, this.canvas.polygon);
        let bisector = new Bisector(middleSector);
        let endpoint1 = bisector.bisectorPiecesDir1.at(-1);
        let endpoint2 = bisector.bisectorPiecesDir2.at(-1);

        let pierogi = Pierogi(endpoint1, s1, this.canvas.polygon);

        this.addSavedZRegion([s1, s2], bisector);
    }

    addSavedZRegion(selectedSites, bisector) {
        const [site1, site2] = selectedSites;
        
        this.savedZRegions.push({
            points: [site1.label, site2.label],
            colors: [site1.color, site2.color],
            bisectorObj: bisector,
        });
    
        this.updateSavedZRegionsList();
    }

    updateSavedZRegionsList() {
        const savedZRegionsContainer = document.getElementById('savedZRegionsContainer');
        const savedZRegionsList = document.getElementById('savedZRegionsList');
        savedZRegionsList.innerHTML = '';
    
        this.savedZRegions.forEach((bisector, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'saved-distance-item';
    
            const span = document.createElement('span');
            const formula = `Z\\text{-}Region(\\color{${bisector.colors[0]}}{${bisector.points[0]}}\\color{black}{, }\\color{${bisector.colors[1]}}{${bisector.points[1]}}\\color{black}{)}`;
    
            katex.render(formula, span, {
                throwOnError: false,
                displayMode: false
            });

            const iconsWrapper = document.createElement('div');
            iconsWrapper.className = 'icons-wrapper';
    
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-times delete-icon';
            deleteIcon.onclick = () => {

                this.savedZRegions = this.savedZRegions.filter(b => b !== bisector);
                // this.canvas.bisectors = this.canvas.bisectors.filter(b => b !== bisector.bisectorObj);
                
                this.updateSavedZRegionsList();
                this.canvas.drawAll();
            };
    
            iconsWrapper.appendChild(deleteIcon);
            listItem.appendChild(span);
            listItem.appendChild(iconsWrapper);
            savedZRegionsList.appendChild(listItem);
        });
    
        if (this.savedZRegions.length === 0) {
            savedZRegionsContainer.classList.remove('has-items');
        } else {
            savedZRegionsContainer.classList.add('has-items');
        }
    }

    activate() {
        this.active = true;
    }

    deactivate() {
        this.active = false;
    }
}