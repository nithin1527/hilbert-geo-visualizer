import {
  Point, 
  Segment, 
  Spoke, 
  BisectorConicEquation, 
  HilbertBall, 
  Site, 
  SelectableSegment, 
  ConvexPolygon,
  MiddleSector,
  Bisector,
  minimumEnclosingHilbertBall
} from './default-objects.js';

export function getPolarBody(polygon, hilbertBall) {
  // Ensure the polygon has at least 3 vertices
  if (polygon.vertices.length < 3) {
    return null;
  }

  // Use the center of the Hilbert ball (its site)
  let center = hilbertBall;

  // Function to calculate the dual line of a vertex
  function vertexDual(v) {
    let a = v.x - center.x;
    let b = v.y - center.y;
    let p1, p2;

    if (a === 0) {
      p1 = new Point(center.x, center.y + 1/b);
      p2 = new Point(center.x + 1, center.y + 1/b);
    } else if (b === 0) {
      p1 = new Point(center.x + 1/a, center.y);
      p2 = new Point(center.x + 1/a, center.y + 1);
    } else {
      p1 = new Point(center.x + 1/a, center.y);
      p2 = new Point(center.x, center.y + 1/b);
    }

    return { p1, p2 };
  }

  // Function to find intersection of two lines
  function intersect(l1, l2) {
    let det = (l1.p1.x - l1.p2.x) * (l2.p1.y - l2.p2.y) - (l1.p1.y - l1.p2.y) * (l2.p1.x - l2.p2.x);
    if (det === 0) return null; // Lines are parallel

    let x = ((l1.p1.x * l1.p2.y - l1.p1.y * l1.p2.x) * (l2.p1.x - l2.p2.x) - 
             (l1.p1.x - l1.p2.x) * (l2.p1.x * l2.p2.y - l2.p1.y * l2.p2.x)) / det;
    let y = ((l1.p1.x * l1.p2.y - l1.p1.y * l1.p2.x) * (l2.p1.y - l2.p2.y) - 
             (l1.p1.y - l1.p2.y) * (l2.p1.x * l2.p2.y - l2.p1.y * l2.p2.x)) / det;

    return new Point(x, y);
  }

  // Calculate dual lines
  let dualLines = polygon.vertices.map(v => vertexDual(v));

  // Calculate intersection points
  let polarVertices = [];
  for (let i = 0; i < dualLines.length; i++) {
    let j = (i + 1) % dualLines.length;
    let intersection = intersect(dualLines[i], dualLines[j]);
    if (intersection) {
      polarVertices.push(intersection);
    }
  }

  // Apply scaling (similar to the Lua version)
  const scaleFactor = 30000; // You can adjust this value
  let scaledVertices = polarVertices.map(v => new Point(
    (v.x - center.x) * scaleFactor + center.x,
    (v.y - center.y) * scaleFactor + center.y
  ));

  // Create a new convex polygon from the polar points
  return new ConvexPolygon(scaledVertices, "orange");
}

function getCollinearPoints(site1, site2, intersectionPoints) {

    let intersectionPointsArr = Array.from(intersectionPoints);
  
    let intersection1 = intersectionPointsArr[0];
    let intersection2 = intersectionPointsArr[1];
  
    // Calculate distances using the ** operator
    let distance1ToSite1 = Math.sqrt((intersection1.x - site1.x) ** 2 + (intersection1.y - site1.y) ** 2);
    let distance1ToSite2 = Math.sqrt((intersection1.x - site2.x) ** 2 + (intersection1.y - site2.y) ** 2);

    let distance2ToSite1 = Math.sqrt((intersection2.x - site1.x) ** 2 + (intersection2.y - site1.y) ** 2);
    let distance2ToSite2 = Math.sqrt((intersection2.x - site2.x) ** 2 + (intersection2.y - site2.y) ** 2);

    // Assign the closer intersection to intersection1
    if (distance1ToSite1 + distance2ToSite2 < distance1ToSite2 + distance2ToSite1) {
        // intersection1 is closer to site1 and intersection2 is closer to site2
    } else {
        // Swap intersections
        let temp = intersection1;
        intersection1 = intersection2;
        intersection2 = temp;
    }

    // Return the points in the order I1, S1, S2, I2
    return [intersection1, site1, site2, intersection2];
}

export function hilbertDistance(site1, site2, polygon) {
    let siteSegment = new Segment(site1, site2);
    let intersectionPoints = polygon.intersectWithLine(siteSegment);
    let [I1, S1, S2, I2] = getCollinearPoints(site1, site2, intersectionPoints);
    return 0.5 * Math.log(norm(S1, I2) * norm(S2, I1) / norm(S2, I2) / norm(S1, I1));
}

/* 
  (points:Point) -> (hull:[Point]) 
  - returns the convex hull of a set of points
  - IOW => points on the hull in order
*/
export function convexHull(points) {
    function orientation(p, q, r) {
      return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    }
  
    let bottomIndex = 0;
    const n = points.length;
  
    for (let i = 1; i < n; i++) {
      if (points[i].y < points[bottomIndex].y || (points[i].y === points[bottomIndex].y && points[i].x < points[bottomIndex].x)) {
        bottomIndex = i;
      }
    }
  
    let hull = [];
    let p = bottomIndex, q;
  
    while (true) {
      hull.push(points[p]);
      q = (p + 1) % n;
      for (let i = 0; i < n; i++) {
        if (orientation(points[p], points[i], points[q]) < 0) {
          q = i;
        }
      }
      p = q;
      if (p === bottomIndex) {
        break;
      }
    }
  
    return hull;
}

/* 
  (a:Point, b:Point) -> (Float) 
  - returns the euclidean distance between two points
*/
export function norm(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/* 
  (A:Point,C:Point,D:Point,r:Float) -> (Point)
  - For collinear points A,B,C,D where A,C,D are known, 
    finds point B located hilbert distance r away from center C
*/
export function getPointOnSpoke(A, C, D, r) {
    const scalar = 1 / (1 + (norm(C, D) / norm(A, C)) * Math.exp(2 * r));
    const dx = D.x - A.x;
    const dy = D.y - A.y;
    return new Point(scalar * dx + A.x, scalar * dy + A.y)
}

/*
  (center:Site, radius:Float) -> ([Point])
*/
export function getPointsOnHilbertBall(center, radius) {
  let points = [];
  center.spokes.forEach(({ A, C, D }) => {
    points.push(getPointOnSpoke(A, C, D, radius));
    points.push(getPointOnSpoke(D, C, A, radius));
  });
  return convexHull(points);
}

export function hilbertMidpoint(s1, s2, omega) {
  let [intersection1, intersection2] = omega.intersectWithLine(new Segment(s1,s2));
  if (norm(s2, intersection2) < norm(s1, intersection2)) {
      var usedIntersection = intersection2;
      var unusedIntersection = intersection1;
      var r = hilbertDistance(s1, s2, omega);
  }
  else {
      var usedIntersection = intersection1;
      var unusedIntersection = intersection2;
      var r = hilbertDistance(s1, s2, omega);
  }
  return getPointOnSpoke(unusedIntersection, s2, usedIntersection, r / 2);
}


/*
  (vertices:Point) -> ([Segment])
*/
export function createSegmentsFromVertices(vertices) {
  if (vertices.length == 0) { return []; } 
  else {
    const segments = [];
    const color = vertices[0].color;
    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      segments.push(new Segment(start,end,color));
    }
    return segments;
  }
}

export function createSelectableSegmentsFromVertices(vertices, ballBoundary = false , ball = null) {
  if (vertices.length == 0) { return []; } 
  else {
    const segments = [];
    const color = vertices[0].color;
    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      segments.push(new SelectableSegment(start,end,color, ballBoundary, ball));
    }
    return segments;
  }
}

/* 
  (s1:Segment, s2:Segment) -> (tion:Point) 
*/
export function intersectSegments(s1, s2, mode = 'line') {
  let intersection = math.intersect(
    [s1.start.x, s1.start.y], [s1.end.x, s1.end.y], 
    [s2.start.x, s2.start.y], [s2.end.x, s2.end.y]
  );

  if (intersection == null) {
    [s1, s2] = [s2, s1];
    intersection = math.intersect(
      [s1.start.x, s1.start.y], [s1.end.x, s1.end.y], 
      [s2.start.x, s2.start.y], [s2.end.x, s2.end.y]);
  }

  if (intersection) {
    const [x, y] = intersection;
    const point = new Point(x, y);

    if (mode === 'segment') {
      const isBetween = (a, b, c) => a <= c && c <= b || b <= c && c <= a;

      const isOnSegment1 = isBetween(s1.start.x, s1.end.x, point.x) && isBetween(s1.start.y, s1.end.y, point.y);
      const isOnSegment2 = isBetween(s2.start.x, s2.end.x, point.x) && isBetween(s2.start.y, s2.end.y, point.y);

      if (isOnSegment1 && isOnSegment2) {
        return point;
      } else {
        return null;
      }
    } else {
      return point;
    }
  }
  return null;
}

/* 
  (site:Site, convexPolygon:ConvexPolygon) -> [Spoke] 
*/
export function getSpokes(site, convexPolygon) {
  const spokes = [];
  convexPolygon.vertices.forEach(vertex => {
      let closestIntersect = null;
      let minDist = Infinity;
      for (let i = 0; i < convexPolygon.segments.length; i++) {
          const segment = convexPolygon.segments[i];
          const intersection = segment.intersect(new Segment(vertex, site));
          if (intersection && !(intersection.isEqual(vertex))) {
            if (intersection.isOn(segment)) {
              const dist = Math.sqrt((intersection.x - site.x) ** 2 + (intersection.y - site.y) ** 2);
              if (dist < minDist) { minDist = dist; closestIntersect = intersection; }
            }
          }
      }
      if (closestIntersect) { spokes.push(new Spoke(vertex, site, closestIntersect, site.color)); }
  });
  return spokes;
}

export function renderAllKaTeX() {
  const container = document.getElementById('infoBoxContainer');
  const infoBoxes = container.getElementsByClassName('infoBox');

  for (const infoBox of infoBoxes) {
    const mathExpression = infoBox.dataset.math;
    if (mathExpression) {
      katex.render(mathExpression, infoBox);
    }
  }
}

export function drawInfoBox(point, canvas, dpr) {
  
  const container = document.getElementById('infoBoxContainer');
  const rect = canvas.getBoundingClientRect();
  const infoBox = document.createElement('div');
  infoBox.className = 'infoBox';
  infoBox.style.borderColor = point.color;
  infoBox.style.zIndex = 999;

  const mathExpression = 
    point.label 
    ? 
    `\\textcolor{${point.color}}{${point.label}: (${point.x.toFixed(0)}, ${point.y.toFixed(0)})}` 
    : 
    `\\textcolor{${point.color}}{(${point.x.toFixed(0)}, ${point.y.toFixed(0)})}`;

  infoBox.dataset.math = mathExpression;
  infoBox.textContent = 
    point.label 
    ? 
    `${point.label}: (${point.x.toFixed(0)}, ${point.y.toFixed(0)})` 
    : 
    `(${point.x.toFixed(0)}, ${point.y.toFixed(0)})`;

  const canvasX = point.x * (rect.width / canvas.width) * dpr;
  const canvasY = point.y * (rect.height / canvas.height) * dpr;

  point.defaultInfoBoxPosition = {
    left: rect.left + canvasX,
    top: rect.top + canvasY - 10
  };

  if (!point.infoBoxPosition) {
      point.infoBoxPosition = {
          left: point.defaultInfoBoxPosition.left,
          top: point.defaultInfoBoxPosition.top
      };
  }

  infoBox.style.left = `${point.infoBoxPosition.left}px`;
  infoBox.style.top = `${point.infoBoxPosition.top}px`;

  container.appendChild(infoBox);

  makeDraggableAroundPoint(infoBox, point, canvas, rect);
}

function makeDraggableAroundPoint(element, point, canvas, canvasRect) {
  let isDragging = false;
  let startX, startY;
  const maxDistance = 50; // Maximum distance from the point
  const dpr = window.devicePixelRatio;

  // Calculate initial top and bottom bounds
  const scale = canvasRect.width / canvas.width;
  const pointX = point.x * scale * dpr + canvasRect.left;
  const pointY = point.y * scale * dpr + canvasRect.top;
  const initialTop = point.defaultInfoBoxPosition.top;
  const initialBottom = initialTop + maxDistance;

  element.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  function startDragging(e) {
    isDragging = true;
    startX = e.clientX - parseInt(element.style.left);
    startY = e.clientY - parseInt(element.style.top);
    e.preventDefault();
  }

  function drag(e) {
    if (!isDragging) return;

    let newX = e.clientX - startX;
    let newY = e.clientY - startY;

    const dx = newX - pointX;
    const dy = newY - pointY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      newX = pointX + maxDistance * Math.cos(angle);
      newY = pointY + maxDistance * Math.sin(angle);
    }
    
    newY = Math.max(initialTop, Math.min(newY, initialBottom));

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  }

  function stopDragging() {
    isDragging = false;
    point.infoBoxPosition = {
      left: parseInt(element.style.left),
      top: parseInt(element.style.top)
    };
  }
}

export function clearInfoBoxes() {
  const container = document.getElementById('infoBoxContainer');
  container.innerHTML = '';
}

export function mouseOnSite(point, site, threshold = 20) {
  return Math.hypot(point.x - site.x, point.y - site.y) <= threshold;
}

export function tanInverse(x, y) {
  if (x<0) {
      return Math.PI + Math.atan(y/x);
  } else if (x==0) {
      if (y>0) {
          return Math.PI/2;
      } else {
          return 3*Math.PI/2;
      }
  } else if (y>=0) {
      return Math.atan(y/x);
  } else {
      return 2*Math.PI + Math.atan(y/x);
  }
}

export function centroid(points) {
  let x = 0;
  let y = 0;

  points.forEach(point => {
    x += point.x;
    y += point.y;
  });

  return new Point(x / points.length, y / points.length);
}

// (line:Segment) -> ([Float])
export function calculateLineEquation(segment) {
  let a, b, c;
  
  const x1 = segment.start.x;
  const y1 = segment.start.y;
  const x2 = segment.end.x;
  const y2 = segment.end.y;

  a = y2 - y1;
  b = x1 - x2;
  c = x2 * y1 - x1 * y2;
  
  return [a, b, c];
}

// (s1:Site, s2:Site, E1:Segment, E2:Segment, E3:Segment, E4:Segment)
// Formula found here: https://arxiv.org/abs/2112.03056
export function getBisectorConicEquation(s, t, E1, E2, E3, E4) {
  let [a1, a2, a3] = calculateLineEquation(E1);
  let [b1, b2, b3] = calculateLineEquation(E2);
  let [c1, c2, c3] = calculateLineEquation(E3);
  let [d1, d2, d3] = calculateLineEquation(E4);
  let k = 
      ( (b1*s.x + b2*s.y + b3) * (c1*t.x + c2*t.y + c3) ) /
      ( (d1*t.x + d2*t.y + d3) * (a1*s.x + a2*s.y + a3) );
  let A = b1*c1 - a1*d1*k;
  let B = b2*c1 + b1*c2 - a1*d2*k - a2*d1*k;
  let C = b2*c2 - a2*d2*k;
  let D = b3*c1 + b1*c3 - a3*d1*k - a1*d3*k;
  let E = b3*c2 + b2*c3 - a2*d3*k - a3*d2*k;
  let F = b3*c3 - a3*d3*k;

  return new BisectorConicEquation(A, B, C, D, E, F);
}

export function solveQuadratic(a, b, c) {
  const discriminant = b * b - 4 * a * c;
  
  if (discriminant > 0) {
      // Two real roots
      const sqrtDiscriminant = Math.sqrt(discriminant);
      return [
          (-b + sqrtDiscriminant) / (2 * a),
          (-b - sqrtDiscriminant) / (2 * a)
      ];
  } else if (discriminant === 0) {
      // One real root
      return [-b / (2 * a)];
  } else {
      // No real roots
      return [];
  }
}

export function determineConic(equation) {
  const { A, B, C } = equation;
  const discriminant = B * B - 4 * A * C;

  if (A === 0 && C === 0) {
    return 'degenerate';
  }

  if (discriminant < 0) {
    return 'ellipse';
  } else if (discriminant === 0) {
    return 'parabola';
  } else {
    return 'hyperbola';
  }
}

export function drawConic(ctx, equation, canvasWidth = 1500, canvasHeight = 850, resolution = 1, color = 'deepskyblue') {
  let conicType = determineConic(equation);
  if (conicType === 'ellipse') {
    let {center, a, b, rotationAngle} = getEllipseParams(equation);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, a, b, rotationAngle, 0, Math.PI * 2);
    ctx.strokeStyle = 'purple';
    ctx.stroke();
  } else {
    drawHyperbola(ctx, {canvasWidth, canvasHeight}, equation, 0.1, 'red');
  }
}

export function drawEllipseOrParabola(ctx, bounds, equation, resolution, color) {
  const { canvasWidth, canvasHeight } = bounds;
  const conicType = determineConic(equation);

  let points = [];

  if (conicType === 'ellipse') {
    console.log("Ellipse");

    for (let x = 0; x <= canvasWidth * 5; x += resolution) {
      const y1 = getConicRoots(equation, x)[0];
      if (y1 >= 0 && y1 < canvasHeight * 5) points.push(new Point(x,y1));
    }

    for (let x = canvasWidth * 5; x >= 0; x -= resolution) {
      const y2 = getConicRoots(equation, x)[1];
      if (y2 >= 0 && y2 < canvasHeight * 5) points.push(new Point(x,y2));
    }

    for (let i = 0; i < points.length; i++) {
      (new Segment(points[i], points[(i+1) % points.length],color,1)).draw(ctx);
    }
  }

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function drawHyperbola(ctx, bounds, equation, resolution, color) {
  const {canvasWidth, canvasHeight} = bounds;
  console.log("Hyperbola");

  for (let x = 0; x <= canvasWidth; x += resolution) {
    for (const y of getConicRoots(equation, x)) {
      if (y >= 0 && y <= canvasHeight) (new Point(x,y,color,0.5)).draw(ctx);
    }
  }
  
  ctx.stroke();
}

export function getConicRoots(equation, x) {
  const { A, B, C, D, E, F } = equation;
  const a = C;
  const b = B * x + E;
  const c = A * x * x + D * x + F;
  return solveQuadratic(a, b, c)
}

export function getOmegaEdges(site, c, omega) {
  let [I1, I2] = omega.intersectWithLine(new Segment(site,c));

  const distI1ToSite = norm(I1, site);
  const distI1ToC = norm(I1, c);
  if (distI1ToSite < distI1ToC) {
    return [omega.findSegment(I1), omega.findSegment(I2)];
  } else {
    return [omega.findSegment(I2), omega.findSegment(I1)];
  }
}

export function drawBoundedConic(ctx, equation, omega, startPoint, endPoint,sector,resolution = 1, color = 'green') {
  let conicType = determineConic(equation);
  if (conicType === 'ellipse') {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    let {center, a, b, rotationAngle} = getEllipseParams(equation);
    const startAngle = pointToAngle(startPoint, center, a, b, rotationAngle);
    const endAngle = pointToAngle(endPoint, center, a, b, rotationAngle);
    let clockwise = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI) < Math.PI;
    ctx.ellipse(center.x, center.y, a, b, rotationAngle, startAngle, endAngle, !clockwise);
    ctx.stroke();
    return;
  } else if (omega.areAnySegmentsParallel(sector.sector)) {
    (new Segment(startPoint, endPoint, color, 2)).draw(ctx);
  } else {
    // Draw a hyperbola with respect to the equation and between the start and end point
    drawBoundedHyperbola(ctx, sector, equation, startPoint, endPoint, resolution, color);
  }
}

function isClose(p1, p2, resolution) {
  return Math.abs(p1.x - p2.x) < resolution &&
          Math.abs(p1.y - p2.y) < resolution;
}

export function getHyperbolaCenter(equation) {
  const {A,B,C,D,E,F} = equation;
  let denominator = B * B - 4 * A * C;
  
  // Check if the denominator is zero (or very close to zero)
  if (Math.abs(denominator) < 1e-10) {
      throw new Error("This conic might not be a hyperbola or the equation might be degenerate.");
  }

  let h = (2 * C * D - B * E) / denominator;
  let k = (2 * A * E - B * D) / denominator;

  return new Point(h,k);
}

export function getEllipseParams(equation) {
  const { A, B, C, D, E, F } = equation;
  
  // Calculate the rotation angle
  let theta = 0.5 * Math.atan2(B, A - C);
  
  // Calculate new coefficients
  let A_prime = A * Math.cos(theta)**2 + B * Math.cos(theta) * Math.sin(theta) + C * Math.sin(theta)**2;
  let B_prime = 0; // This is always 0 after rotation
  let C_prime = A * Math.sin(theta)**2 - B * Math.cos(theta) * Math.sin(theta) + C * Math.cos(theta)**2;
  let D_prime = D * Math.cos(theta) + E * Math.sin(theta);
  let E_prime = -D * Math.sin(theta) + E * Math.cos(theta);
  let F_prime = F;
  
  // Calculate center coordinates
  let x0_prime = -D_prime / (2 * A_prime);
  let y0_prime = -E_prime / (2 * C_prime);
  
  // Calculate semi-major and semi-minor axes
  let common = -4 * F_prime * A_prime * C_prime + C_prime * D_prime**2 + A_prime * E_prime**2;
  let a_squared = common / (4 * A_prime**2 * C_prime);
  let b_squared = common / (4 * A_prime * C_prime**2);
  
  let a = Math.sqrt(Math.abs(a_squared));
  let b = Math.sqrt(Math.abs(b_squared));
  
  // Return all calculated parameters
  return {
    center: { 
      x: x0_prime * Math.cos(theta) - y0_prime * Math.sin(theta), 
      y: x0_prime * Math.sin(theta) + y0_prime * Math.cos(theta)
    },
    a: a,
    b: b,
    rotationAngle: theta,
  };
}

function pointToAngle(point, center, a, b, rotationAngle) {
  // Translate point to origin
  let x = point.x - center.x;
  let y = point.y - center.y;
  
  // Rotate point
  let xRotated = x * Math.cos(-rotationAngle) - y * Math.sin(-rotationAngle);
  let yRotated = x * Math.sin(-rotationAngle) + y * Math.cos(-rotationAngle);
  
  // Calculate angle
  return Math.atan2(yRotated / b, xRotated / a);
}

export function drawBoundedHyperbola(ctx, sector, equation, startPoint, endPoint, resolution = 0.5, color = 'green') {
  const { canvasWidth, canvasHeight } = { canvasWidth: 1500, canvasHeight: 850 };
    
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (endPoint.x < startPoint.x) {
    [startPoint, endPoint] = [endPoint, startPoint];
  }

  ctx.beginPath();
  ctx.moveTo(startPoint.x, startPoint.y);

  const numPoints = Math.ceil((endPoint.x - startPoint.x) / resolution);
  let lastValidPoint = startPoint;

  for (let i = 1; i <= numPoints; i++) {
      const x = startPoint.x + (i / numPoints) * (endPoint.x - startPoint.x);
      const roots = getConicRoots(equation, x);

      let closestY = null;
      let minDistance = Infinity;

      for (const y of roots) {
          if (y >= 0 && y <= canvasHeight) {
              const point = new Point(x, y);
              if (sector.sector.contains(point) || sector.sector.onBoundary(point)) {
                  const distance = Math.abs(y - lastValidPoint.y);
                  if (distance < minDistance) {
                      closestY = y;
                      minDistance = distance;
                  }
              }
          }
      }

      if (closestY !== null) {
          ctx.lineTo(x, closestY);
          lastValidPoint = new Point(x, closestY);
      }
  }

  // Ensure we connect to the endpoint
  ctx.lineTo(endPoint.x, endPoint.y);

  ctx.stroke();

}

export function findNearestNeighborValue(piValues, x, y) {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  let nearestValue = null;
  let nearestDistance = Infinity;

  for (let [dx, dy] of directions) {
    const newX = x + dx;
    const newY = y + dy;
    
    if (newX >= 0 && newX < piValues[0].length && newY >= 0 && newY < piValues.length) {
      const value = piValues[newY][newX];
      if (value !== null) {
        const distance = Math.sqrt(dx*dx + dy*dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestValue = value;
        }
      }
    }
  }

  return nearestValue;
}

export function getHeatMapColor(value) {
  // This function returns a color ranging from blue (cold) to red (hot)
  const hue = ((1 - value) * 240).toString(10);
  return ["hsl(", hue, ",100%,50%)"].join("");
}

export function createPiGradientBar(minPi, maxPi) {
  const gradientContainer = document.getElementById('piGradientContainer');
  const gradientBar = document.getElementById('piGradient');
  const valuesContainer = document.getElementById('piValues');

  // Adjust min and max values to truncate the gradient
  minPi = 3;

  // Create a gradient that matches the heat map
  const gradientSteps = 100; // Increase steps for smoother gradient
  let gradientString = 'linear-gradient(to top,';
  for (let i = 0; i <= gradientSteps; i++) {
    // Normalize value to the new range
    const normalizedValue = 3 + (i / gradientSteps) * (maxPi - 3);
    const color = getHeatMapColor((normalizedValue - 3) / (maxPi - 3));
    gradientString += ` ${color}${i < gradientSteps ? ',' : ')'}`;
  }

  // Update gradient
  gradientBar.style.background = gradientString;

  // Create value labels
  valuesContainer.innerHTML = ''; // Clear existing values
  const numValues = 5; // Number of values to display
  for (let i = 0; i < numValues; i++) {
    const value = minPi + (maxPi - minPi) * (1 - i / (numValues - 1));
    const valueElement = document.createElement('div');
    valueElement.textContent = value.toFixed(2);
    valueElement.style.position = 'absolute';
    valueElement.style.right = '0';
    valueElement.style.top = `${(i / (numValues - 1)) * 100}%`;
    valueElement.style.transform = 'translateY(-50%)';
    valuesContainer.appendChild(valueElement);
  }

  // Show the gradient container
  gradientContainer.style.display = 'block';
}


export function hidePiGradientBar() {
  const gradientContainer = document.getElementById('piGradientContainer');
  if (gradientContainer) {
    gradientContainer.style.display = 'none';
  }
}

export async function createPiMap(ctx, resolution = 1, polygon, stepSize = -1, radius = 1) {
  const minX = Math.min(...polygon.vertices.map(v => v.x)) - 1;
  const maxX = Math.max(...polygon.vertices.map(v => v.x)) + 1;
  const minY = Math.min(...polygon.vertices.map(v => v.y)) - 1;
  const maxY = Math.max(...polygon.vertices.map(v => v.y)) + 1;

  const width = Math.ceil((maxX - minX) / resolution);
  const height = Math.ceil((maxY - minY) / resolution);
  const piValues = Array(height).fill().map(() => Array(width).fill(null));

  let minPi = Infinity;
  let maxPi = 0;

  let minSideLength = Infinity;
  let maxSideLength = 0;
  const sideLengths = Array(height).fill().map(() => Array(width).fill(null));

  // Initialize progress bar
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressBar = document.getElementById('progressBar');
  progressBarContainer.style.display = 'block';
  progressBar.style.width = '0%';

  const totalPoints = width * height;
  let processedPoints = 0;

  const processPoint = async (x, y) => {
    const pointX = minX + x * resolution;
    const pointY = minY + y * resolution;
    const point = new Site(pointX, pointY, polygon, 'blue', false, false, false, 'placeholder', true);
    if (polygon.contains(point) && !polygon.onBoundary(point)) {
      try {
        const hilbertBall = new HilbertBall(point, radius);

        let sideLength = hilbertDistance(hilbertBall.polygon.segments[0].start, hilbertBall.polygon.segments[0].end, hilbertBall.convexPolygon);
        sideLengths[y][x] = sideLength;
        if (sideLength < minSideLength) minSideLength = sideLength;
        if (sideLength > minSideLength) maxSideLength = sideLength;

        const perimeter = hilbertBall.computePerimeter(polygon);
        let pi = perimeter / 2 / radius;

        if (pi >= 3) {
          piValues[y][x] = pi;
        } else {
          piValues[y][x] = 'KNN';
        }

        if (pi !== Infinity) {
          if (pi < minPi) {minPi = pi};
          if (pi > maxPi) {maxPi = pi};
        }

      } catch (error) {
        piValues[y][x] = 'KNN';
        sideLengths[y][x] = 0;
      }
    }

    // Update progress
    processedPoints++;
    const progress = (processedPoints / totalPoints) * 100;
    progressBar.style.width = `${progress}%`;

    // Use requestAnimationFrame to update the UI smoothly
    if (processedPoints % 100 === 0) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      await processPoint(x, y);
    }
  }

  // Hide progress bar
  progressBarContainer.style.display = 'none';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (piValues[y][x] === 'KNN') {
        piValues[y][x] = findNearestNeighborValue(piValues, x, y);
        sideLengths[y][x] = findNearestNeighborValue(sideLengths, x, y);
      }
    }
  }

  const gradientField = computeGradient(piValues, resolution);
  normalizeGradient(gradientField);

  createGradientFlowPlot(gradientField, minX, minY, resolution, "Gradient Flow Map");
  create3DPiPlot(piValues, minX, minY, resolution, "3D Pi Value Plot");
  create3DPiLengthPlot(piValues, minSideLength, maxSideLength, resolution, "3D Side Length Value Plot", sideLengths);
  createPiGradientBar(minPi, maxPi);


  if (stepSize > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const piValue = piValues[y][x];
        let color;
        if (piValue !== null) {  
          if (piValue % stepSize < 0.04) {
            const normalizedValue = (piValue - 3) / (maxPi - 3);
            color = getHeatMapColor(normalizedValue);
          } else {
            color = 'white';
          }
          ctx.fillStyle = color;
          ctx.fillRect(minX + x * resolution, minY + y * resolution, resolution, resolution);
        }
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const piValue = piValues[y][x];
        let color;
        if (piValue !== null) {  
          const normalizedValue = (piValue - 3) / (maxPi - 3);
          color = getHeatMapColor(normalizedValue);
          ctx.fillStyle = color;
          ctx.fillRect(minX + x * resolution, minY + y * resolution, resolution, resolution);
        }
      }
    }
  }

  
}

export function createScatterPlot(xValues, yValues, title, xAxisLabel, yAxisLabel) {
  // Create a new window/tab
  const newWindow = window.open('', '_blank');

  // Write the HTML content to the new window
  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js"></script>
      <style>
        body {
          background-color: black;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        #chartContainer {
          background-color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        }
      </style>
    </head>
    <body>
      <div id="chartContainer">
        <canvas id="scatterPlot" width="1000" height="600"></canvas>
      </div>
      
      <script>
        const ctx = document.getElementById('scatterPlot').getContext('2d');
        new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: '',
              data: ${JSON.stringify(xValues.map((x, i) => ({x, y: yValues[i]})))},
              backgroundColor: 'rgba(0, 0, 255, 1)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: '${title}',
                font: {
                  size: 18,
                  weight: 'bold'
                },
                color: 'black'
              },
              legend: {
                labels: {
                  color: 'black',
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: '${xAxisLabel}',
                  color: 'black',
                  font: {
                    size: 14,
                    weight: 'bold'
                  },
                },
                ticks: {
                  color: 'black'
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)'
                }
              },
              y: {
                title: {
                  display: true,
                  text: '${yAxisLabel}',
                  color: 'black',
                  font: {
                    size: 14,
                    weight: 'bold'
                  },
                },
                ticks: {
                  color: 'black'
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)'
                }
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `);

  // Close the document to finish writing
  newWindow.document.close();
}

export function create3DPiPlot(piValues, minX, minY, resolution, title) {
  // Create a new window/tab
  const newWindow = window.open('', '_blank');

  // Prepare the data for the 3D plot
  const height = piValues.length;
  const width = piValues[0].length;
  const x = Array.from({length: width}, (_, i) => minX + i * resolution);
  const y = Array.from({length: height}, (_, i) => minY + i * resolution);
  const z = piValues;

  // Write the HTML content to the new window
  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      <style>
        body {
          background-color: black;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        #plotContainer {
          width: 1000px;
          height: 600px;
          background-color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        }
      </style>
    </head>
    <body>
      <div id="plotContainer"></div>
      
      <script>
        const data = [{
          x: ${JSON.stringify(x)},
          y: ${JSON.stringify(y)},
          z: ${JSON.stringify(z)},
          type: 'surface',
          colorscale: 'Jet'
        }];

        const layout = {
          title: '${title}',
          scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Pi Value'}
          },
          margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 50
          }
        };

        Plotly.newPlot('plotContainer', data, layout);
      </script>
    </body>
    </html>
  `);

  // Close the document to finish writing
  newWindow.document.close();
}

export function create3DPiLengthPlot(piValues, minX, minY, resolution, title, values) {
  // Create a new window/tab
  const newWindow = window.open('', '_blank');

  // Prepare the data for the 3D plot
  const height = piValues.length;
  const width = piValues[0].length;
  const x = Array.from({length: width}, (_, i) => minX + i * resolution);
  const y = Array.from({length: height}, (_, i) => minY + i * resolution);
  const z = values;

  console.log('minX', minX);
  console.log('minX', minY);

  // Write the HTML content to the new window
  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      <style>
        body {
          background-color: black;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        #plotContainer {
          width: 1000px;
          height: 600px;
          background-color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        }
      </style>
    </head>
    <body>
      <div id="plotContainer"></div>
      
      <script>
        const data = [{
          x: ${JSON.stringify(x)},
          y: ${JSON.stringify(y)},
          z: ${JSON.stringify(z)},
          type: 'surface',
          colorscale: 'Jet'
        }];

        const layout = {
          title: '${title}',
          scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Pi Value'}
          },
          margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 50
          }
        };

        Plotly.newPlot('plotContainer', data, layout);
      </script>
    </body>
    </html>
  `);

  // Close the document to finish writing
  newWindow.document.close();
}

function computeGradient(piValues, resolution) {
  const height = piValues.length;
  const width = piValues[0].length;
  const gradientField = Array(height).fill().map(() => Array(width).fill(null));

  for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
          const dx = (piValues[y][x+1] - piValues[y][x-1]) / (2 * resolution);
          const dy = (piValues[y+1][x] - piValues[y-1][x]) / (2 * resolution);
          gradientField[y][x] = {x: dx, y: dy};
      }
  }

  return gradientField;
}

function normalizeGradient(gradientField) {
  for (let y = 0; y < gradientField.length; y++) {
      for (let x = 0; x < gradientField[0].length; x++) {
          if (gradientField[y][x]) {
              const magnitude = Math.sqrt(gradientField[y][x].x**2 + gradientField[y][x].y**2);
              if (magnitude !== 0) {
                  gradientField[y][x].x /= magnitude;
                  gradientField[y][x].y /= magnitude;
              }
          }
      }
  }
}

export function createGradientFlowPlot(gradientField, minX, minY, resolution, title, scale = 10) {
  // Create a new window/tab
  const newWindow = window.open('', '_blank');

  // Calculate canvas size (increased by a factor of 4)
  const width = gradientField[0].length * resolution * 4;
  const height = gradientField.length * resolution * 4;

  // Write the HTML content to the new window
  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          background-color: black;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        #canvasContainer {
          background-color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        }
      </style>
    </head>
    <body>
      <div id="canvasContainer">
        <canvas id="gradientFlowCanvas" width="${width}" height="${height}"></canvas>
      </div>
      
      <script>
        const canvas = document.getElementById('gradientFlowCanvas');
        const ctx = canvas.getContext('2d');
        const gradientField = ${JSON.stringify(gradientField)};
        const resolution = ${resolution};
        const scale = ${scale};
        const drawingScale = 4; // Scale factor for drawing

        function drawGradientFlow() {
          ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
          ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
          ctx.lineWidth = 2; // Increased line width

          for (let y = 0; y < gradientField.length; y += 5) {
            for (let x = 0; x < gradientField[0].length; x += 5) {
              if (gradientField[y][x]) {
                const startX = x * resolution * drawingScale;
                const startY = y * resolution * drawingScale;
                const endX = startX + gradientField[y][x].x * scale * drawingScale;
                const endY = startY + gradientField[y][x].y * scale * drawingScale;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw arrowhead
                const angle = Math.atan2(endY - startY, endX - startX);
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - 10 * Math.cos(angle - Math.PI / 6), endY - 10 * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(endX - 10 * Math.cos(angle + Math.PI / 6), endY - 10 * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
              }
            }
          }
        }

        drawGradientFlow();
      </script>
    </body>
    </html>
  `);

  // Close the document to finish writing
  newWindow.document.close();
}

export function lineIntersection(p1, p2, p3, p4) {
  // Extract x and y coordinates from point objects
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  
  // parallel case
  if (Math.abs(denom) < 1e-8) {  
      return 'more cowbell'; // breaks when i return null whaaattt
  }
  
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);
  
  return new Point(x,y);
}

export function drawPieceForIntersection(ctx, piece, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (piece.isMiddleSector) {
    ctx.beginPath();
    ctx.moveTo(piece.start.x, piece.start.y);
    ctx.lineTo(piece.end.x, piece.end.y);
    ctx.stroke();
  } else {
    drawBoundedConic(ctx, piece.equation, piece.omega, piece.start, piece.end, piece.sector,1,color);
  }
}

export function isIntersectionPixel(pixelData) {
  const redThreshold = 50;  // Adjust these thresholds as needed
  const blueThreshold = 50;
  const alphaThreshold = 100;  // To ensure we're not detecting nearly transparent pixels
  
  return (
    pixelData[0] > redThreshold &&  // Red channel
    pixelData[2] > blueThreshold && // Blue channel
    pixelData[3] > alphaThreshold   // Alpha channel
  );
}

export function getPointsForDrawboundedShape(piece, isLine = false, resolution = 1) {
  if (isLine) {
    return getPointsOnLine(piece.start, piece.end, resolution);
  } else {
    return getPointsOnConic(piece.equation, piece.start, piece.end, piece.sector, piece.omega, resolution);
  }
}

function getPointsOnLine(start, end, resolution) {
  const points = [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  // Check if the line is vertical
  if (Math.abs(dx) < Number.EPSILON) {
    const steps = Math.max(1, Math.ceil(Math.abs(dy) / resolution));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(new Point(start.x, start.y + t * dy));
    }
  }
  // Check if the line is horizontal
  else if (Math.abs(dy) < Number.EPSILON) {
    const steps = Math.max(1, Math.ceil(Math.abs(dx) / resolution));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(new Point(start.x + t * dx, start.y));
    }
  }
  // Handle diagonal lines
  else {
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(distance / resolution));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(new Point(start.x + t * dx, start.y + t * dy));
    }
  }

  return points;
}

function getPointsOnConic(equation, startPoint, endPoint, sector, omega, resolution) {
  const points = [];
  const { canvasWidth, canvasHeight } = { canvasWidth: 1500, canvasHeight: 850 };
  
  if (endPoint.x < startPoint.x) {
    [startPoint, endPoint] = [endPoint, startPoint];
  }

  const numSegments = Math.ceil(Math.abs(endPoint.x - startPoint.x) / resolution);
  let lastValidPoint = startPoint;
  points.push(startPoint);

  for (let i = 1; i <= numSegments; i++) {
    const x = startPoint.x + (i / numSegments) * (endPoint.x - startPoint.x);
    const roots = getConicRoots(equation, x);

    let validPoints = roots
      .map(y => new Point(x, y))
      .filter(point => point.y >= 0 && point.y <= canvasHeight &&
                       (sector.sector.contains(point) || sector.sector.onBoundary(point)));

    if (validPoints.length > 0) {
      let closestPoint = validPoints.reduce((closest, current) => 
        (Math.abs(current.y - lastValidPoint.y) < Math.abs(closest.y - lastValidPoint.y)) ? current : closest
      );

      let linePoints = getPointsOnLine(lastValidPoint, closestPoint, resolution);
      points.push(...linePoints.slice(1)); // Exclude the first point to avoid duplication
      lastValidPoint = closestPoint;
    }
  }

  // Add final segment to endPoint if necessary
  if (!lastValidPoint.isEqual(endPoint)) {
    let finalLinePoints = getPointsOnLine(lastValidPoint, endPoint, resolution);
    points.push(...finalLinePoints.slice(1));
  }

  return points;
}

export function intersectTwoBisector(bisector1, bisector2) {
  let intersection = null;
        
  outer: for (let point1 of bisector1.points) {
      for (let point2 of bisector2.points) {
          if (Math.abs(point1.x - point2.x) < 1 && Math.abs(point1.y - point2.y) < 1) {
              intersection = point1;
              break outer;
          }
      }
  }

  return intersection
}

export function intersectThreeBisector(bisector1, bisector2, bisector3) {
  let intersection = null;
  
  outer: for (let point1 of bisector1.points) {
    for (let point2 of bisector2.points) {
      if (Math.abs(point1.x - point2.x) < 1 && Math.abs(point1.y - point2.y) < 1) {
        for (let point3 of bisector3.points) {
          if (Math.abs(point1.x - point3.x) < 1 && Math.abs(point1.y - point3.y) < 1) {
            intersection = point1;
            break outer;
          }
        }
      }
    }
  }

  return intersection;
}

export function findHilbertCircumCenter(s1, s2, s3, omega) {
  let middleSector1 = new MiddleSector(s1, s2, omega);
  let middleSector2 = new MiddleSector(s1, s3, omega);
  let middleSector3 = new MiddleSector(s2, s3, omega);
  let bisector1 = new Bisector(middleSector1);
  let bisector2 = new Bisector(middleSector2);
  let bisector3 = new Bisector(middleSector3);
  bisector1.computeBisector(s1,s2);
  bisector2.computeBisector(s1,s3);
  bisector3.computeBisector(s2,s3);

  return intersectThreeBisector(bisector1, bisector2, bisector3)
}

function drawBisectorPoints(bisector, color, ctx) {
  for (let point of bisector.points) {
    point.setColor(color);
    point.draw(ctx)
  }
} 

export function drawBisectorsOfHilbertCircumcenter(s1, s2, s3, omega, ctx) {
  let middleSector1 = new MiddleSector(s1, s2, omega);
  let middleSector2 = new MiddleSector(s1, s3, omega);
  let middleSector3 = new MiddleSector(s2, s3, omega);
  let bisector1 = new Bisector(middleSector1);
  let bisector2 = new Bisector(middleSector2);
  let bisector3 = new Bisector(middleSector3);
  bisector1.computeBisector(s1,s2);
  bisector2.computeBisector(s1,s3);
  bisector3.computeBisector(s2,s3);
  bisector1.draw(ctx);
  bisector2.draw(ctx);
  bisector3.draw(ctx);
  // drawBisectorPoints(bisector1, 'red', ctx);
  // drawBisectorPoints(bisector2, 'blue', ctx);
  // drawBisectorPoints(bisector3, 'green', ctx);
}

export function drawHilbertMinimumEnclosingRadiusBall(sites, omega, ctx) {
  let mehb = new minimumEnclosingHilbertBall(sites, omega);
  console.log("Final mehb: ", mehb);
  mehb.ball.draw(ctx);
}
export function crossProduct(px, py, qx, qy, rx, ry){
  const pqx = qx - px;
  const pqy = qy - py;
  const prx = rx - px;
  const pry = ry - py;
  return pqx * pry - pqy * prx;
}

// Utility function to generate points along a line segment
export function generateLinePoints(start, end, granularity) {
  const points = [];
  const dx = (end.x - start.x) / granularity;
  const dy = (end.y - start.y) / granularity;

  for (let i = 0; i <= granularity; i++) {
    points.push(new Point(start.x + dx * i, start.y + dy * i));
  }

  return points;
}

// Utility function to generate points along an ellipse segment
export function generateEllipsePoints(equation, startPoint, endPoint, granularity) {
  const points = [];
  const { center, a, b, rotationAngle } = getEllipseParams(equation);
  const startAngle = pointToAngle(startPoint, center, a, b, rotationAngle);
  const endAngle = pointToAngle(endPoint, center, a, b, rotationAngle);

  // Determine sweep direction
  const deltaAngle = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
  const clockwise = deltaAngle < Math.PI;

  // Calculate total angle to sweep
  const totalAngle = clockwise ? deltaAngle : (2 * Math.PI - deltaAngle);

  // Calculate angle increment based on granularity
  const angleStep = totalAngle / granularity;

  for (let i = 0; i <= granularity; i++) {
    const angle = startAngle + (clockwise ? 1 : -1) * angleStep * i;
    const x = center.x + a * Math.cos(angle) * Math.cos(rotationAngle) - b * Math.sin(angle) * Math.sin(rotationAngle);
    const y = center.y + a * Math.cos(angle) * Math.sin(rotationAngle) + b * Math.sin(angle) * Math.cos(rotationAngle);
    points.push(new Point(x, y));
  }

  return points;
}

// Utility function to generate points along a hyperbola segment
export function generateHyperbolaPoints(equation, startPoint, endPoint, sector, granularity) {
  const points = [];
  const { canvasWidth, canvasHeight } = { canvasWidth: 1500, canvasHeight: 850 };

  // Determine x-direction
  let leftX = Math.min(startPoint.x, endPoint.x);
  let rightX = Math.max(startPoint.x, endPoint.x);

  // Calculate step size based on granularity
  const xStep = (rightX - leftX) / granularity;

  let lastValidPoint = startPoint;

  for (let i = 1; i <= granularity; i++) {
    const x = leftX + i * xStep;
    const roots = getConicRoots(equation, x);

    let closestY = null;
    let minDistance = Infinity;

    for (const y of roots) {
      if (y >= 0 && y <= canvasHeight) {
        const point = new Point(x, y);
        if (sector.sector.contains(point) || sector.sector.onBoundary(point)) {
          const distance = Math.abs(y - lastValidPoint.y);
          if (distance < minDistance) {
            closestY = y;
            minDistance = distance;
          }
        }
      }
    }

    if (closestY !== null) {
      const newPoint = new Point(x, closestY);
      points.push(newPoint);
      lastValidPoint = newPoint;
    }
  }

  // Ensure the endpoint is included
  points.push(new Point(endPoint.x, endPoint.y));

  return points;
}

/**
 * Creates a 3D plot in a new browser window using Plotly.js.
 *
 * @param {Array} dataTuples - An array of tuples, each representing a point in the form [x, y, z].
 * @param {Object} options - Optional parameters for customization.
 *   - {String} title - The title of the plot.
 *   - {String} plotType - Type of plot: 'scatter3d' or 'surface'.
 *   - {String} color - Color of the markers or surface.
 *   - {Number} markerSize - Size of the markers (applicable for scatter3d).
 *   - {String} colorscale - Color scale for the plot (applicable for surface).
 */
export function create3DPlotInNewWindow(dataTuples, options = {}) {

  const {
    title = '3D Plot',
    plotType = 'scatter3d', // Options: 'scatter3d', 'surface'
    color = 'rgba(255, 0, 0, 0.8)',
    markerSize = 3,
    colorscale = 'Jet',
  } = options;

  // Validate dataTuples
  if (!Array.isArray(dataTuples) || dataTuples.length === 0) {
    console.error('create3DPlotInNewWindow: dataTuples should be a non-empty array of [x, y, z] tuples.');
    return;
  }

  // Extract X, Y, Z coordinates
  const x = dataTuples.map(tuple => tuple[0]);
  const y = dataTuples.map(tuple => tuple[1]);
  const z = dataTuples.map(tuple => tuple[2]);

  // Define the trace based on plot type
  let trace;
  if (plotType === 'scatter3d') {
    trace = {
      x: x,
      y: y,
      z: z,
      mode: 'markers',
      type: 'scatter3d',
      marker: {
        size: markerSize,
        color: z, // Using z for color mapping
        colorscale: colorscale,
        opacity: 0.8,
        colorbar: {
          title: 'Z-Value',
        },
      },
      text: dataTuples.map(tuple => `(${tuple[0]}, ${tuple[1]}, ${tuple[2]})`),
      hoverinfo: 'text',
    };
  } else if (plotType === 'surface') {
    // For surface plots, data needs to be in grid format.
    // Assuming dataTuples form a grid, we need to reshape x, y, z accordingly.

    // Determine unique X and Y values
    const uniqueX = [...new Set(x)].sort((a, b) => a - b);
    const uniqueY = [...new Set(y)].sort((a, b) => a - b);

    const gridX = uniqueX;
    const gridY = uniqueY;
    const gridZ = [];

    // Populate gridZ
    uniqueY.forEach(yi => {
      const row = uniqueX.map(xi => {
        const point = dataTuples.find(tuple => tuple[0] === xi && tuple[1] === yi);
        return point ? point[2] : null; // Assign null if no data point exists
      });
      gridZ.push(row);
    });

    trace = {
      x: gridX,
      y: gridY,
      z: gridZ,
      type: 'surface',
      colorscale: colorscale,
      opacity: 0.8,
      colorbar: {
        title: 'Z-Value',
      },
    };
  } else {
    console.error(`create3DPlotInNewWindow: Unsupported plot type '${plotType}'. Use 'scatter3d' or 'surface'.`);
    return;
  }

  const data = [trace];

  const layout = {
    title: title,
    autosize: true,
    scene: {
      xaxis: { title: 'X' },
      yaxis: { title: 'Y' },
      zaxis: { title: 'Z' },
    },
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 50,
    },
  };

  // Open a new window and write the Plotly plot
  const plotWindow = window.open('', '_blank');

  // HTML content with Plotly.js
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <!-- Load Plotly.js from CDN -->
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: white;
        }
        #plotContainer {
          width: 100vw;
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <div id="plotContainer"></div>
      
      <script>
        const data = ${JSON.stringify(data)};
        const layout = ${JSON.stringify(layout)};
        Plotly.newPlot('plotContainer', data, layout);
      </script>
    </body>
    </html>
  `;

  // Write the HTML content to the new window
  plotWindow.document.write(htmlContent);
  plotWindow.document.close();
}