// site/site.js
import { Site, Point, HilbertBall } from "../../default-objects.js";
import { initMouseActions, initProperties, initShortcuts } from "./hilbert-ball-events.js";
import { SiteManager } from "../site/site.js";
import { mouseOnSite } from "../../default-functions.js";

export class HilbertBallManager extends SiteManager {
  constructor(canvas, hilbertDistanceManager, bisectorManager) {
    super(canvas, hilbertDistanceManager, bisectorManager);
    this.name = "HilbertBallManager";
    initMouseActions(this); 
    initProperties(this);
    initShortcuts(this);
  }

  addSite(event,xInput=null,yInput=null) {
    let x, y;
    if (xInput !== null && yInput !== null) {
        x = xInput;
        y = yInput;
    } else {
        ({ x, y } = this.canvas.getMousePos(event));
    }
    
    if (this.canvas.polygon.contains(new Point(x, y))) {
      const newSite = new Site(x, y, this.canvas.polygon);
      const newBall = new HilbertBall(newSite);

      this.assignHilbertBallProperties(newBall);
      this.prioritize(newBall);
      this.canvas.sites.push(newBall);
      this.drawAll();
    }
  }

  assignHilbertBallProperties(ball) {
    super.assignSiteProperties(ball);
    ball.setBoundaryColor(document.getElementById('ballColor').value);
    ball.setBallRadius(document.getElementById('radiusInput').value);
    ball.setShowPolarBody(document.getElementById('ballShowPolarBody').checked);
  }

  updateHilbertBallProperties(ball) {
    super.updateSiteProperties(ball);
    document.getElementById('ballColor').value = ball.boundaryColor;
    document.getElementById('radiusInput').value = ball.ballRadius;
    document.getElementById('ballShowPolarBody').value = ball.showPolarBody;
  }

  selectHilbertBall(event, multiple = false) {
    super.selectSite(event, multiple);
    const selectedBalls = this.getSelectedSites().filter(site => site instanceof HilbertBall);

    if (selectedBalls.length === 1) {
        this.updateHilbertBallProperties(selectedBalls[0]);
    } else if (selectedBalls.length > 1) {
        const commonColor = selectedBalls[0].boundaryColor;
        const allSameColor = selectedBalls.every(ball => ball.boundaryColor === commonColor);
        if (allSameColor) {
            document.getElementById('ballColor').value = commonColor;
            document.getElementById('ballColor').defaultValue = commonColor; // Ensure default value is set
        } else {
            document.getElementById('ballColor').value = '#000000';
            document.getElementById('ballColor').defaultValue = '#000000'; // Ensure default value is set
        }
    }
}

  startDragging(event) {
    const { x, y } = this.canvas.getMousePos(event);
    this.canvas.sites.forEach(site => {
      if (mouseOnSite({ x, y }, site)) {
        if (!event.shiftKey) {
          this.prioritize(site);
          this.isDragging = true; 
        }
        this.updateHilbertBallProperties(site);
        return;
      }
    });
  }

  setDefaultValuesForMultiple() {
    const selectedBalls = this.getSelectedSites().filter(site => site instanceof HilbertBall);
    if (selectedBalls.length > 1) {
        const siteColor = document.getElementById('siteColor');
        const siteShowInfo = document.getElementById('siteShowInfo');
        const siteDrawSpokes = document.getElementById('siteDrawSpokes');
        const labelInput = document.getElementById('labelInput');
        const ballColor = document.getElementById('ballColor');
        const radiusInput = document.getElementById('radiusInput');

        const commonColor = selectedBalls[0].color;
            const allSameColor = selectedBalls.every(site => site.color === commonColor);
            if (allSameColor) {
                siteColor.defaultValue = commonColor;
                siteColor.value = commonColor;
            } else {
                siteColor.defaultValue = '#0000FF';
                siteColor.value = '#0000FF';
            }

            const commonShowInfo = selectedBalls[0].showInfo;
            const allSameShowInfo = selectedBalls.every(site => site.showInfo === commonShowInfo);
            if (allSameShowInfo) {
                siteShowInfo.defaultChecked = commonShowInfo;
                siteShowInfo.checked = commonShowInfo;
            } else {
                siteShowInfo.checked = false;
                siteShowInfo.defaultChecked = false;
            }

            const commonDrawSpokes = selectedBalls[0].drawSpokes;
            const allSameDrawSpokes = selectedBalls.every(site => site.drawSpokes === commonDrawSpokes);
            if (allSameDrawSpokes) {
                siteDrawSpokes.defaultChecked = commonDrawSpokes;
                siteDrawSpokes.checked = commonDrawSpokes;
            } else {
                siteDrawSpokes.checked = false;
                siteDrawSpokes.defaultChecked = false;
            }

            const commonLabel = selectedBalls[0].label;
            const allSameLabel = selectedBalls.every(site => site.label === commonLabel);
            if (allSameLabel) {
                labelInput.defaultValue = commonLabel;
                labelInput.value = commonLabel;
            } else {
                labelInput.value = '';
                labelInput.defaultValue = '';
            }

        const commonBoundaryColor = selectedBalls[0].boundaryColor;
        const allSameBoundaryColor = selectedBalls.every(ball => ball.boundaryColor === commonBoundaryColor);
        if (allSameBoundaryColor) {
            ballColor.defaultValue = commonBoundaryColor;
            ballColor.value = commonBoundaryColor;
        } else {
            ballColor.value = '#0000FF';
            ballColor.defaultValue = '#0000FF';
        }

        const commonBallRadius = selectedBalls[0].ballRadius;
        const allSameBallRadius = selectedBalls.every(ball => ball.ballRadius === commonBallRadius);
        if (allSameBallRadius) {
            radiusInput.defaultValue = commonBallRadius;
            radiusInput.value = commonBallRadius;
        } else {
            radiusInput.value = '1';
            radiusInput.defaultValue = '1';
        }
    }
}
}