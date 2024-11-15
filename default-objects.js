import {
  convexHull,
  createSegmentsFromVertices,
  intersectSegments,
  getSpokes,
  getPointsOnHilbertBall,
  getBisectorConicEquation,
  solveQuadratic,
  centroid,
  drawConic,
  norm,
  getOmegaEdges,
  drawBoundedConic,
  hilbertDistance,
  getHyperbolaCenter,
  getPolarBody,
  lineIntersection,
  getPointsForDrawboundedShape,
  drawPieceForIntersection,
  createSelectableSegmentsFromVertices,
  createPiGradientBar,
  findNearestNeighborValue,
  getHeatMapColor,
  crossProduct,
  findHilbertCircumCenter,
  determineConic,
  generateEllipsePoints,
  generateHyperbolaPoints,
  generateLinePoints
} from './default-functions.js';

export class Point {
  /* (x:Float, y:Float, color:String, radius:Float) */
  constructor(x, y, color = "purple", radius = 3, showInfo = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = radius;
    this.showInfo = showInfo;
    this.infoBoxPosition = null; // Add this line
    this.defaultInfoBoxPosition = null;
  }

  isOn(segment) {
    if (!(Math.min(segment.start.x, segment.end.x) <= this.x &&
      this.x <= Math.max(segment.start.x, segment.end.x) &&
      Math.min(segment.start.y, segment.end.y) <= this.y &&
      this.y <= Math.max(segment.start.y, segment.end.y))) {
      return false;
    }
    const crossProduct = (this.y - segment.start.y) * (segment.end.x - segment.start.x) -
      (this.x - segment.start.x) * (segment.end.y - segment.start.y);
    const epsilon = 1e-9;
    return Math.abs(crossProduct) < epsilon;
  }

  isEqual(point) {
    const epsilon = 1e-9;
    return Math.abs(this.x - point.x) < epsilon && Math.abs(this.y - point.y) < epsilon;
  }
  setColor(color) { this.color = color; }
  setRadius(radius) { this.radius = radius; }
  setShowInfo(showInfo) { this.showInfo = showInfo; }

  drawSelectionRing(ctx) {
    ctx.strokeStyle = this.color; // Color for the selection ring
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, 2 * Math.PI);
    ctx.stroke();
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  drawWithRing(ctx, ringColor = "red", ringRadius = 8) {
    // outer ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, ringRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // inner ring
    this.draw(ctx);
  }

}

export class Segment {
  /* (start:Point, end:Point, color:String) */
  constructor(start, end, color = "black", penWidth = 2.5) {
    this.start = start;
    this.end = end;
    this.color = color;
    this.penWidth = penWidth;
  }

  /* (segment:Segment) -> (Point) */
  intersect(segment, mode = 'line') {
    let intersection = intersectSegments(this, segment, mode);
    if (intersection) { intersection.setColor(this.color); }
    return intersection
  }

  isEqual(segment) { this.start.isEqual(segment.start) && this.end.isEqual(segment.end) }
  setColor(color) { this.color = color; }
  setPenWidth(penWidth) { this.penWidth = penWidth; }

  draw(ctx) {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.penWidth;
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();
  }
}

export class Spoke {
  /* (A:Point, C:Point, D:Point, color:String) */
  constructor(A, C, D, color = "blue") {
    this.A = A;
    this.C = C;
    this.D = D;
    this.color = color;
  }

  setColor(color) { this.color = color; }

  draw(ctx) {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.A.x, this.A.y);
    ctx.lineTo(this.D.x, this.D.y);
    ctx.stroke();
  }
}

export class Site extends Point {
  /* (x:Float, y:Float, convexPolygon:ConvexPolygon, color:String, drawSpokes:Bool) */
  constructor(siteOrX, y, convexPolygon, color = 'blue', drawSpokes = true, showInfo = false, selected = false, label = '', plain = false) {
    if (siteOrX instanceof Site) {
      super(siteOrX.x, siteOrX.y, siteOrX.color, siteOrX.radius, siteOrX.showInfo);
      this.convexPolygon = siteOrX.convexPolygon;
      this.spokes = siteOrX.spokes;
      this.drawSpokes = siteOrX.drawSpokes;
      this.selected = siteOrX.selected;
      this.label = label;
      this.pspokes = this.getPartialSpokes();
      this.boundedCones = this.getBoundedCones();
    } else {
      super(siteOrX, y, color, 3, showInfo);
      this.convexPolygon = convexPolygon;
      this.spokes = getSpokes(this, this.convexPolygon);
      if (!plain) {
        this.drawSpokes = drawSpokes;
        this.selected = selected;
        this.label = label;
        this.pspokes = this.getPartialSpokes();
        this.boundedCones = this.getBoundedCones();
      }
    }
  }

  getPartialSpokes() {
    let partialSpokes = [];

    this.spokes.forEach((spoke, i) => {
      partialSpokes.push(new PartialSpoke(this, spoke.A, i));
      partialSpokes.push(new PartialSpoke(this, spoke.D, i));
    });

    partialSpokes.sort((a, b) => {
      let angleA = Math.atan2(a.end.y - this.y, a.end.x - this.x);
      let angleB = Math.atan2(b.end.y - this.y, b.end.x - this.x);
      return angleA - angleB;
    });

    return partialSpokes;
  }

  getBoundedCones() {
    let cones = [];
    let pspoke1, pspoke2;
    let pspokes = this.pspokes;
    for (let i = 0; i < pspokes.length; i++) {
      pspoke1 = pspokes[i];
      pspoke2 = pspokes[(i + 1) % pspokes.length];
      let boundedCone = new BoundedCone(pspoke1, pspoke2, this, i);
      boundedCone.setColor("purple");
      boundedCone.setFill("rgba(128, 0, 128, 0.2)");
      cones.push(boundedCone);
    }
    return cones;
  }

  /* (point:Point) -> (BoundedCone)*/
  getBoundedConeOf(point) {
    for (let boundedCone of this.boundedCones) {
      if (boundedCone.contains(point)) return boundedCone;
    }
    return null;
  }

  getBoundaryBoundedConeOf(point, middleIndex) {
    for (let boundedCone of this.boundedCones) {
      if (boundedCone.onBoundary(point) && boundedCone.index !== middleIndex) return boundedCone;
    }
    return null;
  }

  setDrawSpokes(drawSpokes) { this.drawSpokes = drawSpokes; }
  setShowInfo(showInfo) {
    super.setShowInfo(showInfo);
    if (showInfo) this.infoBoxPosition = null;
  }
  setSelected(selected) { this.selected = selected; }
  setColor(color) {
    this.color = color;
    this.spokes.forEach(spoke => spoke.setColor(color)); // Ensure spokes are also updated if needed
  }
  setPolygon(polygon) {
    this.convexPolygon = polygon;
    this.spokes = getSpokes(this, this.convexPolygon);
    this.pspokes = this.getPartialSpokes();
  }

  computeSpokes() {
    this.spokes = getSpokes(this, this.convexPolygon);
    this.pspokes = this.getPartialSpokes();
    this.boundedCones = this.getBoundedCones();
  }

  draw(ctx) {
    if (this.drawSpokes) {
      this.spokes.forEach((spoke) => {
        spoke.setColor(this.color);
        spoke.draw(ctx);
      });
    }
    if (this.selected) {
      this.drawSelectionRing(ctx);
    }
    super.draw(ctx);
  }
}

export class ConvexPolygon {
  constructor(vertices = [], color = "black", penWidth = 2.5, showInfo = false, showVertices = true, vertexRadius = 3, showPiMap = false) {
    if (vertices.length > 0) {
      this.vertices = convexHull(vertices);
    } else {
      this.vertices = vertices;
    }
    this.segments = createSegmentsFromVertices(this.vertices);
    this.color = color;
    this.penWidth = penWidth;
    this.showInfo = showInfo;
    this.showVertices = showVertices;
    this.vertexRadius = vertexRadius;
    if (vertices.length > 2) this.showPiMap = showPiMap;
  }

  addVertex(vertex) {
    this.vertices.push(vertex);
    this.vertices = convexHull(this.vertices);
    if (this.vertices.length > 1) { this.segments = createSegmentsFromVertices(this.vertices); }
  }

  onBoundary(point) {
    for (let segment of this.segments) {
      if (point.isOn(segment)) return true;
    }
    for (let vertex of this.vertices) {
      if (point.isEqual(vertex)) return true;
    }
    return false;
  }

  contains(point) {
    let vertices = this.vertices;
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const { x: xi, y: yi } = vertices[i];
      const { x: xj, y: yj } = vertices[j];
      if ((yi > point.y) !== (yj > point.y) && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /* (body:ConvexPolygon, line:Segment) -> (Set(Point)) */
  intersectWithLine(line) {
    let intersections = [];
    const epsilon = 1e-10; // Small value for floating-point comparison

    function isCloseTo(a, b) { return Math.abs(a - b) < epsilon; }

    function isDuplicate(point, existingPoints) {
      return existingPoints.some(existing =>
        isCloseTo(existing.x, point.x) && isCloseTo(existing.y, point.y)
      );
    }

    for (let edge of this.segments) {
      let intersection = edge.intersect(line);
      if (intersection && intersection.isOn(edge)) {
        if (!isDuplicate(intersection, intersections)) intersections.push(intersection);
      }
    }

    return intersections;
  }

  arePointsEqual(point1, point2, epsilon = 1e-9) {
    return Math.abs(point1.x - point2.x) < epsilon && Math.abs(point1.y - point2.y) < epsilon;
  }

  /* (segment1: Segment, segment2: Segment) -> (Boolean) */
  areParallel(segment1, segment2) {
    let deltaX1 = segment1.end.x - segment1.start.x;
    let deltaY1 = segment1.end.y - segment1.start.y;
    let deltaX2 = segment2.end.x - segment2.start.x;
    let deltaY2 = segment2.end.y - segment2.start.y;

    // Check if both segments are vertical
    if (deltaX1 === 0 && deltaX2 === 0) return true;

    // Check if one segment is vertical and the other is not
    if ((deltaX1 === 0 && deltaX2 !== 0) || (deltaX1 !== 0 && deltaX2 === 0)) return false;

    // Calculate slopes
    let slope1 = deltaY1 / deltaX1;
    let slope2 = deltaY2 / deltaX2;

    return Math.abs(slope1 - slope2) < 1e-9; // Consider slopes equal if difference is less than a small epsilon
  }

  areAnySegmentsParallel(otherPolygon) {
    for (let segment1 of this.segments) {
      for (let segment2 of otherPolygon.segments) {
        if (this.areParallel(segment1, segment2)) return true;
      }
    }
    return false;
  }

  /* (polygon:ConvexPolygon) -> ([Point]) */
  intersectWithPolygon(polygon) {
    let intersections = [];

    for (let edge1 of this.segments) {
      for (let edge2 of polygon.segments) {
        if (this.areParallel(edge1, edge2)) continue;
        let intersection = edge1.intersect(edge2, 'segment');
        if (intersection) {
          if (!intersections.some(point => this.arePointsEqual(point, intersection))) {
            intersections.push(intersection);
          }
        }
      }
    }
    return intersections;
  }

  /* (BisectorConicEquation) -> ([Point])*/
  intersectWithConic(equation) {
    const { A, B, C, D, E, F } = equation;
    let intersections = [];

    for (let segment of this.segments) {
      let x1 = segment.start.x;
      let y1 = segment.start.y;
      let x2 = segment.end.x;
      let y2 = segment.end.y;
      let alpha = x2 - x1;
      let beta = y2 - y1;

      // Coefficients of the quadratic equation
      let a = A * alpha * alpha + B * alpha * beta + C * beta * beta;
      let b = alpha * (2 * A * x1 + B * y1 + D) + beta * (B * x1 + 2 * C * y1 + E);
      let c = A * x1 * x1 + B * x1 * y1 + C * y1 * y1 + D * x1 + E * y1 + F;

      // Solve the quadratic equation
      let solutions = solveQuadratic(a, b, c);

      // Check if solutions are within the segment
      for (let t of solutions) {
        const epsilon = 1e-10;
        if (t >= -epsilon && t <= 1 + epsilon) {
          let x = x1 + t * alpha;
          let y = y1 + t * beta;
          intersections.push(new Point(x, y));
        }
      }
    }

    return intersections;
  }

  findSegment(point) {
    for (let segment of this.segments) {
      if (point.isOn(segment)) return segment;
    }
    return null;
  }

  /* (polygon:ConvexPolygon) -> (ConvexPolygon) */
  createPolygonIntersection(polygon) {
    let intersectionPoints = this.intersectWithPolygon(polygon);

    this.vertices.forEach(vertex => {
      if (polygon.contains(vertex) || polygon.onBoundary(vertex)) {
        if (!intersectionPoints.some(point => this.arePointsEqual(point, vertex))) {
          intersectionPoints.push(vertex);
        }
      }
    });

    polygon.vertices.forEach(vertex => {
      if (this.contains(vertex) || this.onBoundary(vertex)) {
        if (!intersectionPoints.some(point => this.arePointsEqual(point, vertex))) {
          intersectionPoints.push(vertex);
        }
      }
    });

    if (intersectionPoints.length < 3) return null;
    let newPolygon = new ConvexPolygon(intersectionPoints, "purple")
    newPolygon.setFill("rgba(128, 0, 128, 0.2)");

    return newPolygon;
  }

  setColor(color) {
    this.color = color;
    this.segments.forEach(segment => {
      segment.setColor(color);
    })
  }
  setPenWidth(penWidth) { this.penWidth = penWidth; }
  setShowInfo(showInfo) { this.showInfo = showInfo; }
  setShowVertices(showVertices) { this.showVertices = showVertices; }
  setVertexRadius(vertexRadius) { this.vertexRadius = vertexRadius; }
  setFill(fillColor) { this.fillColor = fillColor; }
  setShowDiagonals(showDiag) { this.showDiag = showDiag; }

  draw(ctx) {
    if (this.vertices.length > 0) {
      this.segments.forEach((segment) => {
        segment.setPenWidth(this.penWidth);
        segment.setColor(this.color);
        segment.draw(ctx);
      });

      if (this.showVertices) {
        this.vertices.forEach((vertex) => {
          if (!(vertex instanceof Site)) vertex.setColor(this.color);
          vertex.setRadius(this.vertexRadius);
          if (this.showInfo) { vertex.setShowInfo(true); }
          else { vertex.setShowInfo(false); }
          vertex.draw(ctx);
        });
      }

      if (this.showDiag) {

        if (this.segments.length > 3) {

          let newSegments = [];

          for (let i = 0; i < this.segments.length; i++) {
            let s1 = this.segments[i];
            for (let j = 1; j < this.segments.length - 1; j++) {
              let s2 = this.segments[(j + 2) % this.segments.length];
              let intersection = lineIntersection(s1.start, s1.end, s2.start, s2.end);

              let newSegment1 = new Segment(s1.end, intersection, this.color);
              let newSegment2 = new Segment(intersection, s2.start, this.color);
              newSegments.push(newSegment1);
              newSegments.push(newSegment2);

              this.vertices.forEach(omegaVertex => {
                if (
                  !(
                    omegaVertex.isEqual(s1.start) ||
                    omegaVertex.isEqual(s1.end) ||
                    omegaVertex.isEqual(s2.start) ||
                    omegaVertex.isEqual(s2.end)
                  )
                ) {
                  let hiddenDiagonal = new Segment(intersection, omegaVertex, 'gray', 1);
                  hiddenDiagonal.draw(ctx);
                }
              });
            }
          }

          newSegments.forEach(newSegment => { newSegment.draw(ctx); });


          if (this.vertices.length > 2) {
            for (let i = 0; i < this.vertices.length; i++) {
              let v1 = this.vertices[i];
              for (let j = 1; j < this.vertices.length - 1; j++) {
                let v2 = this.vertices[(j + 1) % this.vertices.length];
                let newSegment = new Segment(v1, v2, this.color, 1);
                newSegment.draw(ctx);
              }
            }
          }

        }
      }

    }
  }

  fill(ctx, fillColor = 'rgba(0, 0, 0, 0.5)') {
    if (this.vertices.length > 0) {
      ctx.fillStyle = this.fillColor ? this.fillColor : fillColor;
      ctx.beginPath();
      ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
      for (let i = 1; i < this.vertices.length; i++) {
        ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

export class HilbertBall extends Site {
  /* (site:Site, radius:Float, color:String, penWidth:Float) */
  constructor(site, ballRadius = 1, penWidth = 1, boundaryColor = null) {
    super(site);
    this.ballRadius = ballRadius;
    this.pointsOnBall = getPointsOnHilbertBall(this, this.ballRadius);
    this.boundaryColor = boundaryColor;
    this.polygon = new ConvexPolygon(this.pointsOnBall, this.boundaryColor, penWidth);
    this.polarBody = getPolarBody(this.polygon, this);
  }

  setBoundaryColor(color) {
    this.boundaryColor = color;
    this.polygon.setColor(this.boundaryColor);
  }

  setPenWidth(penWidth) { this.polygon.setPenWidth(penWidth); }
  setShowInfo(showInfo) { this.showInfo = showInfo; }
  setSelected(selected) { this.selected = selected; }
  setBallRadius(radius) {
    this.ballRadius = radius;
    this.computeHilbertBall();
  }
  setShowPolarBody(showPolarBody) { this.showPolarBody = showPolarBody; }
  setShowSideLines(showSideLines) { this.showSideLines = showSideLines; }

  computeHilbertBall() {
    this.pointsOnBall = getPointsOnHilbertBall(this, this.ballRadius);
    this.polygon = new ConvexPolygon(this.pointsOnBall, this.boundaryColor, this.polygon.penWidth);
    this.polarBody = getPolarBody(this.polygon, this);
  }

  computePerimeter(polygon) {
    let perim = 0;
    this.polygon.segments.forEach(segment => {
      perim += hilbertDistance(segment.start, segment.end, polygon);
    });
    return perim
  }

  computePerimeter_(polygon) {
    let perim = 0;
    this.polygon.segments.forEach(segment => {
      let length = hilbertDistance(segment.start, segment.end, polygon);
      perim += length;
      // console.log('Segment:', segment, 'Length: ', length);
    });
    return perim
  }

  calculateMaximumSideLength(polygon) {
    let maxL = 0;
    this.polygon.segments.forEach(segment => {
      let length = hilbertDistance(segment.start, segment.end, polygon);
      if (maxL < length) {
        maxL = length;
      }
    });
    return maxL;
  }

  draw(ctx) {
    this.polygon.setShowVertices(false);

    if (this.showInfo) {
      super.setShowInfo(true);
      this.polygon.setShowInfo(true);
    }

    if (this.selected) {
      this.setPenWidth(2);
    } else {
      this.setPenWidth(1);
    }

    this.polygon.draw(ctx);
    super.draw(ctx);

    if (this.showPolarBody) {
      this.polarBody.setShowVertices(false);
      this.polarBody.draw(ctx);
    }

    if (this.showSideLines) {
      for (let i = 0; i < this.pointsOnBall.length; i++) {
        let p1 = this.pointsOnBall[i];
        let p2 = this.pointsOnBall[(i + 1) % this.pointsOnBall.length];
        let intersections = this.convexPolygon.intersectWithLine(new Segment(p1, p2));
        if (intersections.length == 2) {
          // Generate a unique color for each line
          let hue = (i * 137.5) % 360; // Use golden angle approximation for color distribution
          let color = `hsl(${hue}, 70%, 50%)`;
          new Segment(intersections[0], intersections[1], color).draw(ctx);
        }
      }
    }
  }
}

export class SelectableSegment extends Segment {

  constructor(point1, point2, color = 'black', ballBoundary = false, ball = null) {
    super(point1, point2, color);
    this.selected = false;
    this.belongsToBallBoundary = ballBoundary;
    this.ball = ball;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.selected ? 3 : this.penWidth; // Thicker line if selected
    ctx.stroke();
  }

  setSelected(selected) {
    this.selected = selected;
  }

  containsPoint(point) {
    if (!(Math.min(this.start.x, this.end.x) <= point.x && point.x <= Math.max(this.start.x, this.end.x) &&
      Math.min(this.start.y, this.end.y) <= point.y && point.y <= Math.max(this.start.y, this.end.y))) {
      return false;
    } else {
      return true;
    }
  }


  isWithinSelectionBox(minX, minY, maxX, maxY) {
    return (
      this.point1.x >= minX && this.point1.x <= maxX && this.point1.y >= minY && this.point1.y <= maxY &&
      this.point2.x >= minX && this.point2.x <= maxX && this.point2.y >= minY && this.point2.y <= maxY
    );
  }
}

export class PartialSpoke extends Segment {
  // intersectionPoint is intersection point with omega, could be vertex
  // (site:Site, intersectionPoint:Point, index:Number)
  constructor(site, intersectionPoint, index, color = "purple") {
    super(site, intersectionPoint, color);
    this.site = site;
    this.index = index;
    this.intersectionPoint = intersectionPoint;
  }
}

export class MiddleSector {
  // (s1: Site, s2: Site, omega: ConvexPolygon)
  constructor(s1, s2, omega) {
    this.s1 = s1;
    this.s2 = s2;
    this.omega = omega;
    this.isDegenerate = false;
    this.boundedCone1 = null;
    this.boundedCone2 = null;
    this.OE1 = null;
    this.OE2 = null;

    this.sector = this.createMiddleSector();
    let c = centroid(this.sector.vertices);
    let [OE1, OE2] = getOmegaEdges(this.s1, c, this.omega);

    this.equation = getBisectorConicEquation(
      this.s1,
      this.s2,
      OE1,
      OE2,
      OE2,
      OE1
    );
    this.endpoints = this.sector.intersectWithConic(this.equation);
    this.bisectorPiece = new BisectorPiece(this.endpoints[0], this.endpoints[1], this.equation, this.omega, this.sector, true, false, true);
  }

  createMiddleSector() {
    let s1 = this.s1;
    let s2 = this.s2;

    s1.pspokes.forEach(pspoke => {
      if (s2.isOn(pspoke)) {
        this.isDegenerate = true;
        return new ConvexPolygon([this.s1, this.s2]);
      }
    });

    this.boundedCone1 = s1.getBoundedConeOf(s2);
    this.boundedCone2 = s2.getBoundedConeOf(s1);
    let middleSector = this.boundedCone1.createPolygonIntersection(this.boundedCone2);
    return middleSector;
  }

  draw(ctx) {
    this.sector.setColor("purple");
    this.sector.setFill("rgba(128, 0, 128, 0.2)");
    this.sector.draw(ctx);
    this.sector.fill(ctx);

    new Segment(this.endpoints[0], this.endpoints[1], "green", 2).draw(ctx);

    this.endpoints.forEach(endpoint => {
      endpoint.setColor("green");
      endpoint.draw(ctx);
    });

  }
}

export class BoundedCone extends ConvexPolygon {
  constructor(pspoke1, pspoke2, site, index) {
    super([pspoke1.start, pspoke1.end, pspoke2.end])
    this.site = site;
    this.OE = new Segment(pspoke1.end, pspoke2.end);
    this.index = index;
  }
}

export class BisectorConicEquation {
  constructor(A, B, C, D, E, F) {
    this.A = A;
    this.B = B;
    this.C = C;
    this.D = D;
    this.E = E;
    this.F = F;
  }
}

export class Sector {
  constructor(boundaryCone, nonBoundaryCone) {
    this.boundedCones = { bc1: boundaryCone, bc2: nonBoundaryCone };
    this.sector = boundaryCone.createPolygonIntersection(nonBoundaryCone);
  }

  draw(ctx) {
    this.sector.draw(ctx);
  }

  fill(ctx) {
    this.sector.fill(ctx);
  }
}

export class Bisector {
  constructor(middleSector) {
    this.middleSector = middleSector;
    this.s1 = middleSector.s1;
    this.s2 = middleSector.s2;
    this.omega = middleSector.omega;
    this.computeBisector(this.s1, this.s2);
    this.points = this.middleSector.bisectorPiece.pointsOnPiece;
  }

  getBisectorPieces(startingEndpoint) {

    let endpoint = startingEndpoint;
    let currentBoundedCones = this.middleSectorCones;
    let bisectorPieces = [];

    while (!this.omega.onBoundary(endpoint)) {
      try {
        let sector = this.getSectorOf(endpoint, currentBoundedCones);
        let c = centroid(sector.sector.vertices);

        let [OE1, OE2] = getOmegaEdges(this.s1, c, this.omega);
        let [OE3, OE4] = getOmegaEdges(this.s2, c, this.omega);

        let equation = getBisectorConicEquation(this.s1, this.s2, OE1, OE2, OE3, OE4);

        let newEndPoint, flag = false, isLine = false;
        if (this.omega.areAnySegmentsParallel(sector.sector)) {
          let center = getHyperbolaCenter(equation);
          newEndPoint = center;
          flag = true;
          isLine = true;
        }

        if (!flag) {
          let endpoints = sector.sector.intersectWithConic(equation);
          let sortedEndpoints = endpoints
            .filter(e => !e.isEqual(endpoint))
            .map(e => ({ point: e, distance: norm(endpoint, e) }))
            .sort((a, b) => a.distance - b.distance);
          newEndPoint = sortedEndpoints[0].point;
        }

        let piece = new BisectorPiece(endpoint, newEndPoint, equation, this.omega, sector, isLine);
        bisectorPieces.push(piece);
        this.points = this.points.concat(piece.pointsOnPiece);

        if (flag) break;

        endpoint = newEndPoint;
        currentBoundedCones = sector.boundedCones;

      } catch (error) {
        break;
      }

    }

    return bisectorPieces;
  }

  getSectorOf(endpoint, cones) {
    let { boundaryCone, nonBoundaryCone } = this.getCones(endpoint, cones);
    return new Sector(boundaryCone, nonBoundaryCone);
  }

  getCones(endpoint, currentSectorCones) {
    let { bc1, bc2 } = currentSectorCones;

    let boundaryCone, nonBoundaryCone;

    if (!bc1.site.isEqual(this.s1)) [bc1, bc2] = [bc2, bc1];

    let boundaryBC1 = this.s1.getBoundaryBoundedConeOf(endpoint, bc1.index);
    let boundaryBC2 = this.s2.getBoundaryBoundedConeOf(endpoint, bc2.index);

    if (boundaryBC1) {
      boundaryCone = boundaryBC1;
      nonBoundaryCone = bc2;
    } else {
      boundaryCone = boundaryBC2;
      nonBoundaryCone = bc1;
    }
    return { boundaryCone, nonBoundaryCone }
  }

  

  computeBisector(s1, s2) {
    this.middleSector = new MiddleSector(s1, s2, this.omega);
    this.s1 = s1;
    this.s2 = s2;
    this.middleSectorCones = { bc1: this.middleSector.boundedCone1, bc2: this.middleSector.boundedCone2 };
    this.bisectorPiecesDir1 = this.getBisectorPieces(this.middleSector.endpoints[0]);
    this.bisectorPiecesDir2 = this.getBisectorPieces(this.middleSector.endpoints[1]);
    this.bisectorPieces = [this.middleSector.bisectorPiece].concat(this.bisectorPiecesDir1, this.bisectorPiecesDir2);
  }

  getPlottingPoints() {
    // console.log(this.bisectorPieces.reduce((acc, piece) => acc.concat(piece.plottingPoints), []));
    return this.middleSector.bisectorPiece.plottingPoints
    // this.bisectorPieces.reduce((acc, piece) => acc.concat(piece.plottingPoints), []);
  }

  draw(ctx) {
    this.bisectorPieces.forEach(piece => {
      piece.draw(ctx);
    });
  }
}

export class BisectorPiece {
  constructor(start, end, equation, omega, sector, isMiddleSector = false, drawCentroid = false, isLine = false) {
    this.start = start;
    this.end = end;
    this.equation = equation;
    this.omega = omega;
    this.sector = sector;
    this.drawCentroid = drawCentroid;
    this.isMiddleSector = isMiddleSector;
    this.isLine = this.isMiddleSector ? true : isLine
    this.color = "green";

    this.pointsOnPiece = getPointsForDrawboundedShape(this, this.isLine);
    this.plottingPoints = this.generatePoints();
  }

  generatePoints(granularity = 20) {
    if (this.isMiddleSector) {
      return generateLinePoints(this.start, this.end, granularity);
    } else {
      return [];
    }
    // if (this.isLine) {
    //   return generateLinePoints(this.start, this.end, granularity);
    // } else {
    //   const conicType = determineConic(this.equation);
    //   if (conicType === 'ellipse') {
    //     return generateEllipsePoints(this.equation, this.start, this.end, granularity);
    //   } else if (conicType === 'hyperbola') {
    //     return generateHyperbolaPoints(this.equation, this.start, this.end, this.sector, granularity);
    //   } else {
    //     console.warn("Unsupported conic type:", conicType);
    //     return [];
    //   }
    // }
  }

  draw(ctx, color = 'green') {

    this.setColor(color);

    if (this.showSectors) {
      this.sector.draw(ctx);
      this.sector.fill(ctx);
    }

    this.start.setColor(this.color);
    this.end.setColor(this.color);
    this.start.setRadius(2);
    this.end.setRadius(2);
    this.start.draw(ctx);
    this.end.draw(ctx);


    if (this.drawCentroid) this.drawCentroid(ctx);
    if (this.isMiddleSector) (new Segment(this.start, this.end, this.color, 2)).draw(ctx);
    else drawBoundedConic(ctx, this.equation, this.omega, this.start, this.end, this.sector, 1, this.color);
  }

  setShowSectors(showSectors) {
    this.showSectors = showSectors;
  }

  setColor(color) {
    this.color = color;
  }

  drawCentroid(ctx) {
    let c = centroid(this.sector.sector.vertices);
    c.setColor("red");
    c.draw(ctx);
  }
}

export class VertexPierogi {
  constructor(site, center, omega) {
    this.center = center;
    this.omega = omega;
  }
}

export class Pierogi {
  constructor(site, center, omega) {
    this.center = center;
    this.omega = omega;
  }

  draw(ctx) {

  }
}

export class ZRegion {
  constructor(pierogi1, pierogi2) {
    this.pierogi1 = pierogi1;
    this.pierogi2 = pierogi2;
  }

  draw(ctx) {
    let flag = false;
    this.omega.vertices.forEach(vertex => {
      if (vertex.isEqual(this.center)) {
        flag = true;
        return
      }
    });

    if (!flag) {

    }
  }
}

// Determine the Hilbert Ball of minimum radius that encloses a set of sites within a convex n-gon Omega.
export class minimumEnclosingHilbertBall {

  /* (points:Array) */
  constructor(points, omega) {
    this.points = points;
    this.omega = omega;
    this.ball = this.makeBall(this.shuffledPoints(this.points));
  }

  /* (shuffled:Array) */
  shuffledPoints(points) {
    if (!Array.isArray(points) || points.length === 0) {
      console.error("Invalid input: points must be a non-empty array.");
      return [];
    }

    let shuffled = points.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /* (ball:HilbertBall, p:Site) */
  isInBall(ball, p) {
    if (hilbertDistance(ball.site, p, omega) <= ball.ballRadius)
      return true;
    return false;
  }

  /* (shuffled:Array) */
  makeBall(shuffled) {
    /* Iterate through points. If point p is in current MEB, proceed; 
    else, call function to recompute MEB to contain p on its boundary. */
    let ball = null;
    console.log("ball is null.");

    for (let i = 0; i < shuffled.length; i++) {
      const p = shuffled[i];
      console.log("Checking point p: (", p.x, ",", p.y, ")");
      if (ball === null || !ball.polygon.contains(p)) {
        console.log("points:", shuffled.slice(0, i));
        ball = this.makeBallOnePoint(shuffled.slice(0, i), p);
        console.log("Ball enclosing p: ", ball);
      }
    }
    return ball;
  }


  /* (points:Array, p:Site) */
  makeBallOnePoint(points, p) {
    if (!Array.isArray(points)) {
      console.error("Invalid input: points must be an array.");
      return null;
    }
    if (!p || typeof p !== 'object' || !('x' in p) || !('y' in p)) {
      console.error("Invalid input: p must be a valid point object with x and y properties.");
      return null;
    }
    console.log("Creating HilbertBall with p:", p);

    // Create Hilbert Ball of radius 0 centered at point p.
    let ball;
    try {
      ball = new HilbertBall(p, 0);
    } catch (error) {
      console.error("Error creating HilbertBall:", error);
      return null;
    }

    // console.log("makeBallOnePoint parameter p: ", p);
    // console.log("makeBallOnePoint initial ball:", ball.x, ball.y, ball.ballRadius);
    if (points.length >= 0) {
      for (let i = 0; i < points.length; i++) {
        const q = points[i];
        if (!q || typeof q !== 'object' || !('x' in q) || !('y' in q)) {
          console.warn(`Skipping invalid point at index ${i}.`);
          continue;
        }
        // console.log("Checking point q: (", q.x, ",", q.y, ")");
        if (!ball.polygon.contains(q)) {
          /* If site q is not contained within our current MEB, call necessary functions
          to recompute MEB to contain both p and q on its boundary. */
          if (ball.ballRadius == 0) {
            // console.log("Calling makeBottomLeftMost for point q (", q.x, ",", q.y, ")");
            ball = this.makeBottomLeftMost(p, q);
          } else {
            // console.log("Calling makeBallTwoPoints for point q (", q.x, ",", q.y, ")");
            ball = this.makeBallTwoPoints(points.slice(0, i), p, q);
          }
        }
      }
    }

    return ball;
  }

  /* (p:Site, q:Site) */
  makeBottomLeftMost(p, q) {
    /* Return Hilbert Ball whose radius is equivalent to H(p,q)/2 and whose center
    is at the left-bottommost point of the two sites' geodesic region. */
    let middleSectorPQ = new MiddleSector(p, q, this.omega);
    let endpoints = middleSectorPQ.endpoints;
    let center;
    let firstEndpoint = endpoints[0];
    // console.log("firstEndpoint:", firstEndpoint.x, firstEndpoint.y);
    let secondEndpoint = endpoints[1];
    // console.log("secondEndpoint:", secondEndpoint.x, secondEndpoint.y);
    if (firstEndpoint.y < secondEndpoint.y) {
      center = firstEndpoint;
    } else if (firstEndpoint.y == secondEndpoint.y) {
      if (firstEndpoint.x < secondEndpoint.x) {
        center = firstEndpoint;
      } else {
        center = secondEndpoint;
      }
    } else {
      center = secondEndpoint;
    }

    if (center === null || center === undefined || center === `undefined` || center.x === undefined || center.y === undefined) {
      console.log ("center.x undefined error caught in makeBottomLeftMost");
      return null;
    } else {
      // console.log("center has been updated for bottom-leftmost: ", center.x, center.y);
      let radius = hilbertDistance(new Site(center.x, center.y, this.omega), p, this.omega);
      // console.log("radius has been udpated for bottom-leftmost: ", radius);
      let ballCenter = new Site(center.x, center.y, this.omega);

      return new HilbertBall(ballCenter, radius);
    }
  }

  /* (points:Array, p:Site, q:Site) */
  makeBallTwoPoints(points, p, q) {
    // console.log("calling makeBallTwoPoints...");
    const centerBall = this.makeBottomLeftMost(p, q);
    // console.log("centerBall:", centerBall);
    let left = null;
    let right = null;
    for (const r of points) {
      // console.log("Checking point r: ", r);
      if (!centerBall.polygon.contains(r)) {
        // console.log("r is not contained in centerBall.");
        let cross = crossProduct(p.x, p.y, q.x, q.y, r.x, r.y);
        console.log("cross:", cross);
        let circum = this.makeCircumcircle(p, q, r);
        if (circum === null) {
          // continue;
          console.log("r is in the Z-region of p and q...creating diameter balls...")
          let circum1 = this.makeBottomLeftMost(p, r);
          let circum2 = this.makeBottomLeftMost(q, r);
          if (circum1.polygon.contains(q)) {
            circum = circum1;
          } else if (circum2.polygon.contains(p)) {
            circum = circum2;
          }
        } 
        if (cross > 0 && (left === null || crossProduct(p.x, p.y, q.x, q.y, circum.x, circum.y) > crossProduct(p.x, p.y, q.x, q.y, left.x, left.y))) {
          left = circum;
          console.log("left has been updated: ", left);
        } else if (cross < 0 && (right === null || crossProduct(p.x, p.y, q.x, q.y, circum.x, circum.y) < crossProduct(p.x, p.y, q.x, q.y, right.x, right.y))) {
          right = circum;
          console.log("right has been updated: ", right);
        }
      }
    }

    if (left === null && right === null)
      return centerBall;
    else if (left === null && right !== null)
      return right;
    else if (left !== null && right === null)
      return left;
    else if (left !== null && right !== null)
      return left.r <= right.r ? left : right;
  }

  /* (p:Site, q:Site, r:Site) */
  makeCircumcircle(p, q, r) {
    /* Return Hilbert circumcircle, in which sites p, q, and r lie on its boundary. */
    let center = findHilbertCircumCenter(p, q, r, this.omega);
    if (center === null || center === undefined || center === `undefined` || center.x === undefined || center.y === undefined) {
      console.log ("center.x undefined error caught in makeCircumcircle");
      return null;
    } else {
      let radius = hilbertDistance(new Site(center.x, center.y, this.omega), p, this.omega);
      console.log("circumradius: ", radius);

      return new HilbertBall(new Site(center.x, center.y, this.omega), radius);
    }
  }
}