import { hilbertDistance } from "../../default-functions.js";

export class HilbertDistanceManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.name = "HilbertDistanceManager";
        this.usedLabels = new Set();
        this.savedDistances = [];
    }

    onTwoSitesSelected(selectedSites) {
        this.ensureLabels(selectedSites);

        const [site1, site2] = selectedSites;
        const distance = hilbertDistance(site1, site2, this.canvas.polygon);

        this.displayDistance(site1, site2, distance);
    }

    ensureLabels(selectedSites) {
        selectedSites.forEach(site => {
            if (!site.label) site.label = this.getAutoLabel();
        });
    }

    getAutoLabel() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let index = 0;

        while (true) {
            let label = '';
            let tempIndex = index;

            do {
                label = alphabet[tempIndex % 26] + label;
                tempIndex = Math.floor(tempIndex / 26) - 1;
            } while (tempIndex >= 0);

            if (!this.usedLabels.has(label)) {
                this.usedLabels.add(label);
                return label;
            }

            index++;
        }
    }

    deleteSite(site) {
        if (site.label) {
            this.usedLabels.delete(site.label);
            this.savedDistances.forEach(distance => {
                if (distance.points.includes(site.label)) {
                    distance.permanentlyStatic = true; // Mark distance as static if it involves a deleted site
                }
            });
        }
    }

    displayDistance(site1, site2, distance) {
        const text = `d(\\color{${site1.color}}{${site1.label}}\\color{black}{, }\\color{${site2.color}}{${site2.label}}\\color{black}{)} = ${distance.toFixed(2)}`;
        const card = document.getElementById('distanceCard');
        const textElement = document.getElementById('distanceText');
        
        katex.render(text, textElement, {
            throwOnError: false
        });

        card.style.display = 'block';
    }

    hideDistanceCard() {
        const card = document.getElementById('distanceCard');
        card.style.display = 'none';
    }

    activate() {
        this.active = true;
    }

    deactivate() {
        this.active = false;
    }

    addSavedDistance(selectedSites) {
        this.ensureLabels(selectedSites);
        const [site1, site2] = selectedSites;
        const distanceValue = hilbertDistance(site1, site2, this.canvas.polygon);

        this.savedDistances.push({
            points: [site1.label, site2.label],
            colors: [site1.color, site2.color],
            value: distanceValue,
            static: true, // Newly added distances are static
            permanentlyStatic: false
        });

        this.updateSavedDistancesList();
    }

    updateSavedDistancesList() {
        const savedDistancesContainer = document.getElementById('savedDistancesContainer');
        const savedDistancesList = document.getElementById('savedDistancesList');
        savedDistancesList.innerHTML = ''; // Clear the list
    
        this.savedDistances.forEach(distance => {
            const listItem = document.createElement('li');
            listItem.className = 'saved-distance-item';
    
            const span = document.createElement('span');
            const formula = `d(\\color{${distance.colors[0]}}{${distance.points[0]}}\\color{black}{, }\\color{${distance.colors[1]}}{${distance.points[1]}}\\color{black}{)} = ${distance.value.toFixed(2)}`;
    
            katex.render(formula, span, {
                throwOnError: false,
                displayMode: false
            });
    
            const iconsWrapper = document.createElement('div');
            iconsWrapper.className = 'icons-wrapper';
    
            if (!distance.permanentlyStatic) {
                const toggleIcon = document.createElement('i');
                toggleIcon.className = distance.static ? 'fas fa-route toggle-icon tracking-off' : 'fas fa-route toggle-icon tracking-on';
                toggleIcon.onclick = () => {
                    distance.static = !distance.static;
                    toggleIcon.className = distance.static ? 'fas fa-route toggle-icon tracking-off' : 'fas fa-route toggle-icon tracking-on';
                };
                iconsWrapper.appendChild(toggleIcon); // Append the toggle icon to the wrapper
            }
    
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-times delete-icon';
            deleteIcon.onclick = () => {
                this.savedDistances = this.savedDistances.filter(d => d !== distance);
                this.updateSavedDistancesList();
            };
    
            iconsWrapper.appendChild(deleteIcon); // Append the delete icon to the wrapper

            listItem.appendChild(span);
            listItem.appendChild(iconsWrapper); // Append the wrapper to the list item
    
            savedDistancesList.appendChild(listItem);
        });
    
        if (this.savedDistances.length === 0) {
            savedDistancesContainer.classList.remove('has-items');
        } else {
            savedDistancesContainer.classList.add('has-items');
        }
    }

    updateSavedDistances() {
        this.savedDistances = this.savedDistances.map(distance => {
            if (distance.static || distance.permanentlyStatic) return distance; // Do not update static distances
            const site1 = this.canvas.sites.find(site => site.label === distance.points[0]);
            const site2 = this.canvas.sites.find(site => site.label === distance.points[1]);
            if (site1 && site2) {
                return {
                    ...distance,
                    value: hilbertDistance(site1, site2, this.canvas.polygon)
                };
            } else {
                // If one of the sites is deleted, keep the distance static
                return distance;
            }
        });
        this.updateSavedDistancesList();
    }

    resetLabels() {
        this.usedLabels.clear();
    }
}