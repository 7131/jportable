// SVG core class
const SvgCore = function(svg) {
    jmotion.Core.call(this, svg);

    // graphic elements
    this._hands = this._getElements(this.front, "use", "_hand");
    this._arms = [];
    this._arms.push(this._getElements(this.back, "line", "_right"));
    this._arms.push(this._getElements(this.back, "line", "_left"));
}

// SVG core prototype
SvgCore.prototype = Object.create(jmotion.Core.prototype, {

    // set the animation
    "animate": { "value": function(chain) {
        // hands
        const count = Math.min(chain.arms.length, this._hands.length);
        for (let i = 0; i < count; i++) {
            const element = this._hands[i];
            const hand = this._createPlaneChains(element.id, [], chain.arms[i][0]);
            this._appendAnimation(element, hand);
        }

        // arms
        const number = Math.min(chain.arms.length, this._arms.length);
        for (let i = 0; i < number; i++) {
            // starting with the wrist
            const length = Math.min(chain.arms[i].length - 1, this._arms[i].length);
            for (let j = 0; j < length; j++) {
                const element = this._arms[i][j];
                const arm1 = this._createPlaneChains(element.id, [], chain.arms[i][j], "x1", "y1");
                const arm2 = this._createPlaneChains(element.id, [], chain.arms[i][j + 1], "x2", "y2");
                this._appendAnimation(element, arm1, arm2);
            }

            // last joint
            if (length < this._arms[i].length) {
                const element = this._arms[i][length];
                const arm1 = this._createPlaneChains(element.id, [], chain.arms[i][length], "x1", "y1");
                this._appendAnimation(element, arm1);
            }
        }

        // props
        const init = [];
        for (const states of chain.props) {
            const first = states.init[0] || states.loop[0];
            init.push({ "x": first.x.getFirstValue(), "y": first.y.getFirstValue() });
        }
        this.drawProps(init);
        const props = this._getElements(this.middle, "use", "_prop").reverse();
        for (let i = 0; i < props.length; i++) {
            const element = props[i];
            const prop = this._createPlaneChains(element.id, chain.props[i].init, chain.props[i].loop);
            this._appendAnimation(element, prop);
        }

        // resize
        this.setScale(chain.scale);
        this.setStyle({ "stroke-width": chain.width });

        // remove unused props
        const defs = this._getElements(this.defs, "circle", "prop");
        const refs = props.map(elem => elem.href.baseVal.slice(1));
        defs.filter(elem => !refs.includes(elem.id)).forEach(this.defs.removeChild, this.defs);
    }},

    // get the graphic elements
    "_getElements": { "value": function(layer, type, key) {
        const elements = [];
        for (const element of layer.getElementsByTagName(type)) {
            if (0 <= element.id.indexOf(key)) {
                elements.push(element);
            }
        }
        return elements;
    }},

    // create planar animation chain
    "_createPlaneChains": { "value": function(name, init, loop, x, y) {
        const chain = new AnimChain(name, x || "x", y || "y");
        return chain.setPlanes(init, loop);
    }},

    // append animations
    "_appendAnimation": { "value": function(parent, ...chains) {
        for (const chain of chains) {
            chain.createElements().forEach(parent.appendChild, parent);
        }
    }},

});

// Animation creator class
const AnimCreator = function() {
    // orbit of the joint
    this.joints = {};
    this.joints.right = [
        [
            this._createAnimPair(-90, 10, -60, 30, -30, 10),
            this._createAnimPair(-70, -30, -60, -23, -50, -30),
        ],
        [
            this._createAnimPair(-30, 10, -60, -10, -90, 10),
            this._createAnimPair(-50, -30, -60, -37, -70, -30),
        ],
    ];
    this.joints.left = [
        [
            this._createAnimPair(90, 10, 60, 30, 30, 10),
            this._createAnimPair(70, -30, 60, -23, 50, -30),
        ],
        [
            this._createAnimPair(30, 10, 60, -10, 90, 10),
            this._createAnimPair(50, -30, 60, -37, 70, -30),
        ],
    ];

    // prop offset relative to hand
    this.offset = { "right": new DOMPoint(0, -10), "left": new DOMPoint(0, -10) };

    // fields
    this._scale = 1;
    this._tick = 480;
}

// Animation creator prototype
AnimCreator.prototype = {

    // calculate animation chains
    "calculateChain": function(table, synch) {
        // check prop data
        const chain = { "arms": [], "props": [] };
        if (!Array.isArray(table) || table.some(elem => !this._isValidProp(elem, synch))) {
            return chain;
        }

        // get numbers in data
        const numbers = new Set();
        table.forEach(elem => elem.numbers.forEach(numbers.add, numbers));
        numbers.delete(2);

        // get scale
        const divisions = [ 12, 11, 10, 9, 9, 8, 8, 7, 7, 6, 6, 6, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3 ];
        const max = Array.from(numbers).reduce((acc, cur) => Math.max(acc, Math.abs(cur)), 5);
        const div = Math.min(max - 5, divisions.length - 1);
        this._scale = (max - 1) / 4;

        // orbit of each arm
        chain.arms.push(this._getArmChains(this.joints.right, false));
        chain.arms.push(this._getArmChains(this.joints.left, !synch));

        // orbit of each prop
        const right = this._getPropHolds(this.joints.right, this.offset.right);
        const left = this._getPropHolds(this.joints.left, this.offset.left);
        for (const prop of table) {
            chain.props.push(this._getPropChains(prop, right, left, synch));
        }

        // set the size
        chain.scale = this._scale;
        chain.width = divisions[0] / divisions[div];
        return chain;
    },

    // create an animation pair
    "_createAnimPair": function(sx, sy, mx, my, ex, ey) {
        const p1 = { "x": sx, "y": sy };
        const p2 = { "x": mx, "y": my };
        const p3 = { "x": ex, "y": ey };
        const pair = new AnimPair();
        return pair.setEllipse(p1, p2, p3);
    },

    // whether it is valid prop data
    "_isValidProp": function(prop, synch) {
        // time of first throw
        if (isNaN(prop.start) || prop.start < 0) {
            return false;
        }

        // length of one cycle
        if (isNaN(prop.length) || prop.length < 0) {
            return false;
        }

        // throw height
        if (!Array.isArray(prop.numbers) || prop.numbers.length != prop.length) {
            return false;
        }
        if (prop.numbers.some(elem => isNaN(elem) || elem == 0)) {
            return false;
        }
        if (!synch && prop.numbers.some(elem => elem < 0)) {
            return false;
        }

        // time to throw
        if (!Array.isArray(prop.times) || prop.times.length != prop.length) {
            return false;
        }
        if (prop.times.some(elem => isNaN(elem) || elem < 1)) {
            return false;
        }
        return true;
    },

    // get the entire arm movements
    "_getArmChains": function(joints, lagged) {
        // leading movement
        const unit = this._tick / this._scale;
        const chains = [];
        for (const joint of joints[0]) {
            const plane = joint.total.copy().setDuring(unit);
            if (lagged) {
                // there is a delay in start
                plane.addBegin(unit);
            } else {
                // no delay in start
                plane.addBegin(0);
            }
            chains.push([ plane ]);
        }

        // subsequent movements
        for (let i = 1; i < joints.length; i++) {
            for (let j = 0; j < chains.length; j++) {
                const plane = joints[i][j].total.copy().setDuring(unit);
                chains[j].push(plane);
            }
        }
        return chains;
    },

    // get the animation holding the prop
    "_getPropHolds": function(joints, offset) {
        const pairs = [];
        for (const joint of joints.filter(elem => 0 < elem.length)) {
            pairs.push(joint[0].copy().move(offset));
        }
        return pairs;
    },

    // get the entire movement of the prop
    "_getPropChains": function(prop, forward, opposite, synch) {
        const states = { "init": [], "loop": [] };
        const unit = this._tick / this._scale;
        const half = unit / 2;
        let init = 0;

        // before start
        let lag = prop.start % 2;
        if (lag == 1) {
            [ forward, opposite ] = [ opposite, forward ];
            if (!synch) {
                init = unit;
            }
        }

        // initial operation
        let time = prop.start;
        for (let i = 0; i < time - lag; i++) {
            const plane = forward[i % forward.length].total.copy().setDuring(unit);
            if (0 < init) {
                plane.addBegin(init);
                init = 0;
            }
            states.init.push(plane);
        }

        // tweak
        let prev = prop.numbers[prop.length - 1];
        if (prev == 1) {
            const plane = forward[time % forward.length].first.copy().setDuring(half);
            states.init.push(plane);
        }

        // repetitive motion
        let index = (time - lag) % forward.length;
        for (let i = 0; i < prop.numbers.length; i++) {
            const number = prop.numbers[i];

            // an orbit from catch to throw
            let from;
            if (number == 1 || prev == 1) {
                if (number == 1) {
                    from = forward[index].first.copy().setDuring(half);
                } else {
                    from = forward[index].second.copy().setDuring(half);
                }
            } else {
                from = forward[index].total.copy().setDuring(unit);
            }
            if (number != 1 || prev != 1) {
                if (0 < init) {
                    from.addBegin(init);
                    init = 0;
                }
                states.loop.push(from);
            }

            // parabolic orbit from throw to catch
            if (number == 2) {
                const plane = forward[(index + 1) % forward.length].total.copy().setDuring(unit);
                states.loop.push(plane);
            } else {
                const abs = Math.abs(number);
                if (prop.times[i] % 2 == 1) {
                    // when throwing to the opposite hand
                    [ forward, opposite ] = [ opposite, forward ];
                    if (!synch) {
                        lag = 1 - lag;
                    }
                }
                time += abs;
                index = (time - lag) % forward.length;
                let to = forward[index].total.copy().setDuring(unit);
                if (number == 1) {
                    to = forward[index].second.copy().setDuring(half);
                }
                const air = Math.max(1, abs - 1);
                const height = air * air * 15 / this._scale;

                // animation pair
                const p1 = { "x": from.x.getLastValue(), "y": from.y.getLastValue() };
                const p3 = { "x": to.x.getFirstValue(), "y": to.y.getFirstValue() };
                const p2 = { "x": (p1.x + p3.x) / 2, "y": p1.y - height };
                const pair = new AnimPair();
                pair.setDuring(unit * air);
                pair.setParabola(p1, p2, p3);
                states.loop.push(pair.total);
            }
            prev = number;
        }
        return states;
    },

}

// Animation chain class
const AnimChain = function(name, x, y) {
    this.name = name || "";
    this.x = x || "";
    this.y = y || "";
    this._init = null;
    this._loop = null;
}

// Animation chain prototype
AnimChain.prototype = {

    // set the animation planes
    "setPlanes": function(init, loop) {
        this._init = this._connectPlanes(init);
        this._loop = this._connectPlanes(loop);
        if (this._init == null) {
            if (this._loop != null) {
                // repetitive motion only
                this._loop.setId(this.name).setBegin().addBegin(this._loop);
            }
        } else {
            if (this._loop == null) {
                // initial operation only
                this._init.setId(this.name).setBegin();
            } else {
                // initial operation and repetitive motion
                this._init.setId(this.name, 0).setBegin();
                this._loop.setId(this.name, 1).setBegin(this._init).addBegin(this._loop);
            }
        }
        return this;
    },

    // create SVG elements
    "createElements": function() {
        const parts = [];
        if(this._init != null) {
            parts.push(this._init.createElements());
        }
        if(this._loop != null) {
            parts.push(this._loop.createElements());
        }
        return parts.flat();
    },

    // connect animation planes
    "_connectPlanes": function(planes) {
        if (!Array.isArray(planes) || planes.length == 0) {
            return null;
        }
        planes.forEach(elem => elem.setAttribute(this.x, this.y));
        const copy = planes[0].copy();
        for (let i = 1; i < planes.length; i++) {
            copy.addPlane(planes[i].copy());
        }
        return copy;
    },

}

// Animation pair class
const AnimPair = function() {
    this.first = new AnimPlane();
    this.second = new AnimPlane();
    this.total = new AnimPlane();
}

// Animation pair prototype
AnimPair.prototype = {

    // set the duration time (ms)
    "setDuring": function(value) {
        const half = value / 2;
        this.first.setDuring(half);
        this.second.setDuring(half);
        this.total.setDuring(value);
        return this;
    },

    // set elliptic splines
    "setEllipse": function(p1, p2, p3) {
        const accel = new EllipseAccel();
        const decel = new EllipseDecel();
        const first = { "x": accel, "y": decel };
        const second = { "x": decel, "y": accel };
        this._setSplines(p1, p2, p3, first, second);
        return this;
    },

    // set parabolic splines
    "setParabola": function(p1, p2, p3) {
        const linear = new LinearSpline();
        const accel = new ParabolaAccel();
        const decel = new ParabolaDecel();
        const first = { "x": linear, "y": decel };
        const second = { "x": linear, "y": accel };
        this._setSplines(p1, p2, p3, first, second);
        return this;
    },

    // move by the offset
    "move": function(offset) {
        this.first.move(offset.x, offset.y);
        this.second.move(offset.x, offset.y);
        this.total.move(offset.x, offset.y);
        return this;
    },

    // copy this instance
    "copy": function() {
        const pair = new AnimPair();
        pair.first = this.first.copy();
        pair.second = this.second.copy();
        pair.total = this.total.copy();
        return pair;
    },

    // set the splines
    "_setSplines": function(p1, p2, p3, first, second) {
        const linear = new LinearSpline();
        this.first.setValues([ p1.x, p2.x ], [ p1.y, p2.y ]);
        this.second.setValues([ p2.x, p3.x ], [ p2.y, p3.y ]);
        this.total.setValues([ p1.x, p2.x, p3.x ], [ p1.y, p2.y, p3.y ]);

        // first half
        if (Math.sign(p2.x - p1.x) * Math.sign(p2.y - p1.y) == 0) {
            // in the case of a straight line
            this.first.addSpline(linear, linear);
            this.total.addSpline(linear, linear);
        } else {
            // in the case of an arc
            this.first.addSpline(first.x, first.y);
            this.total.addSpline(first.x, first.y);
        }

        // second half
        if (Math.sign(p3.x - p2.x) * Math.sign(p3.y - p2.y) == 0) {
            // in the case of a straight line
            this.second.addSpline(linear, linear);
            this.total.addSpline(linear, linear);
        } else {
            // in the case of an arc
            this.second.addSpline(second.x, second.y);
            this.total.addSpline(second.x, second.y);
        }
    },

}

// Animation plane class
const AnimPlane = function(x, y) {
    this.x = x || new AnimLine();
    this.y = y || new AnimLine();
}

// Animation plane prototype
AnimPlane.prototype = {

    // add another animation plane
    "addPlane": function(plane) {
        this.x.addLine(plane.x);
        this.y.addLine(plane.y);
    },

    // set the ID
    "setId": function(value, postfix) {
        this.x.setId(value, postfix);
        this.y.setId(value, postfix);
        return this;
    },

    // set the operation attributes
    "setAttribute": function(x, y) {
        this.x.setAttribute(x);
        this.y.setAttribute(y);
        return this;
    },

    // set the start timing
    "setBegin": function(value) {
        let begin = value;
        if (begin == null) {
            const begins = this.getBegins();
            if (begins.length == 0) {
                begin = 0;
            } else {
                begin = begins[0];
            }
        }
        this.clearBegins();
        this.addBegin(begin);
        return this;
    },

    // add the start timing
    "addBegin": function(value) {
        if (value instanceof AnimPlane) {
            this.x.addBegin(value.x);
            this.y.addBegin(value.y);
        } else {
            this.x.addBegin(value);
            this.y.addBegin(value);
        }
        return this;
    },

    // clear the start timing list
    "clearBegins": function() {
        this.x.clearBegins();
        this.y.clearBegins();
        return this;
    },

    // get the start timing list
    "getBegins": function() {
        const x = this.x.getBegins();
        if (0 < x.length) {
            return x;
        }
        return this.y.getBegins();
    },

    // set the duration time (ms)
    "setDuring": function(value) {
        this.x.setDuring(value);
        this.y.setDuring(value);
        return this;
    },

    // set the list of values
    "setValues": function(xs, ys) {
        this.x.setValues(xs);
        this.y.setValues(ys);
        return this;
    },

    // add the splines
    "addSpline": function(x, y) {
        this.x.addSpline(x);
        this.y.addSpline(y);
        return this;
    },

    // move by the offset
    "move": function(dx, dy) {
        this.x.move(dx);
        this.y.move(dy);
        return this;
    },

    // copy this instance
    "copy": function() {
        return new AnimPlane(this.x.copy(), this.y.copy());
    },

    // create SVG elements
    "createElements": function() {
        const parts = [];
        parts.push(this.x.createElements());
        parts.push(this.y.createElements());
        return parts.flat();
    },

}

// Animation line class
const AnimLine = function() {
    this._id = "";
    this._attribute = "";
    this._begins = [];
    this._during = 0;
    this._mode = "spline";
    this._values = [];
    this._divisions = [];
    this._splines = [];
}

// Animation line prototype
AnimLine.prototype = {

    // add another animation line
    "addLine": function(line) {
        this._during += line.getDuring();
        Array.prototype.push.apply(this._values, line.getValues().slice(1));
        Array.prototype.push.apply(this._divisions, line.getDivisions());
        Array.prototype.push.apply(this._splines, line.getSplines());
    },

    // set the ID
    "setId": function(value, postfix) {
        if (postfix == null || postfix === "") {
            this._id = `${value}_${this._attribute}`;
        } else {
            this._id = `${value}_${this._attribute}_${postfix}`;
        }
        return this;
    },

    // get the ID
    "getId": function() {
        return this._id;
    },

    // set the operation attribute
    "setAttribute": function(value) {
        this._attribute = value;
        return this;
    },

    // add the start timing
    "addBegin": function(value) {
        if (this._begins.indexOf(value) < 0) {
            this._begins.push(value);
        }
        return this;
    },

    // clear the start timing list
    "clearBegins": function() {
        this._begins = [];
        return this;
    },

    // get the start timing list
    "getBegins": function() {
        return this._begins;
    },

    // set the duration time (ms)
    "setDuring": function(value) {
        if (isNaN(value)) {
            value = 0;
        }
        const before = this._during;
        this._during = value;
        if (before == 0) {
            this._divideTime();
        } else {
            const scale = value / before;
            this._divisions = this._divisions.map(elem => elem * scale);
        }
        return this;
    },

    // get the duration time (ms)
    "getDuring": function() {
        return this._during;
    },

    // set the list of values
    "setValues": function(values) {
        if (!Array.isArray(values)) {
            return this;
        }
        this._values = [];
        Array.prototype.push.apply(this._values, values.filter(elem => !isNaN(elem)));
        this._divideTime();
        return this;
    },

    // get the list of values
    "getValues": function() {
        return this._values;
    },

    // get the first value
    "getFirstValue": function() {
        return this._values[0];
    },

    // get the last value
    "getLastValue": function() {
        return this._values[this._values.length - 1];
    },

    // get a time division list
    "getDivisions": function() {
        return this._divisions;
    },

    // add the splines
    "addSpline": function(value) {
        if (!(value instanceof SplineBase)) {
            return this;
        }
        this._splines.push(value);
        return this;
    },

    // get the splines
    "getSplines": function() {
        return this._splines;
    },

    // move by the offset
    "move": function(value) {
        this._values = this._values.map(elem => elem + value);
        return this;
    },

    // copy this instance
    "copy": function() {
        const copy = new AnimLine();
        copy.setAttribute(this._attribute);
        this._begins.forEach(copy.addBegin, copy);
        copy.setDuring(this._during);
        copy.setValues(this._values);
        this._splines.forEach(copy.addSpline, copy);
        return copy;
    },

    // create SVG elements
    "createElements": function() {
        // start timing
        const begins = [];
        for (const element of this._begins) {
            if (isNaN(element)) {
                const id = element.getId();
                if (id != "") {
                    begins.push(`${id}.end`);
                } else {
                    begins.push(element);
                }
            } else {
                begins.push(this._getTime(element));
            }
        }

        // get the number of divisions
        const total = this._divisions.reduce((acc, cur) => acc + cur, 0);
        let sum = 0;
        const times = [ 0 ];
        for (const division of this._divisions) {
            sum += division;
            times.push(sum / total);
        }

        // create an animation element
        const element = document.createElementNS("http://www.w3.org/2000/svg", "animate");
        element.setAttribute("id", this._id);
        element.setAttribute("attributeName", this._attribute);
        element.setAttribute("begin", begins.join(";"));
        element.setAttribute("dur", this._getTime(this._during));
        element.setAttribute("calcMode", this._mode);
        element.setAttribute("values", this._values.join(";"));
        element.setAttribute("keyTimes", times.join(";"));
        element.setAttribute("keySplines", this._splines.map(elem => elem.createText()).join(";"));
        return element;
    },

    // divide time
    "_divideTime": function() {
        const count = this._values.length - 1;
        if (count < 1) {
            this._divisions = [];
        } else {
            this._divisions = new Array(count).fill(this._during / count);
        }
    },

    // get a time string
    "_getTime": function(value) {
        return `${value}ms`;
    },

}

// Spline base class
const SplineBase = function(p1, p2) {
    this.values = [ p1 || 0, p2 || 0 ];
}

// Spline base prototype
SplineBase.prototype = {

    // create text
    "createText": function() {
        const points = [];
        const length = this.values.length;
        for (let i = 0; i < length; i++) {
            points.push(`${(i + 1) / (length + 1)},${this.values[i]}`);
        }
        return points.join(" ");
    },

}

// Linear spline class
const LinearSpline = function() {
    SplineBase.call(this, 1 / 3, 2 / 3);
}
LinearSpline.prototype = Object.create(SplineBase.prototype);
LinearSpline.prototype.constructor = LinearSpline;

// Parabolic acceleration spline class
const ParabolaAccel = function() {
    SplineBase.call(this, 0, 1 / 3);
}
ParabolaAccel.prototype = Object.create(SplineBase.prototype);
ParabolaAccel.prototype.constructor = ParabolaAccel;

// Parabolic reduction spline class
const ParabolaDecel = function() {
    SplineBase.call(this, 2 / 3, 1);
}
ParabolaDecel.prototype = Object.create(SplineBase.prototype);
ParabolaDecel.prototype.constructor = ParabolaDecel;

// Elliptic acceleration spline class
const EllipseAccel = function() {
    const factor = (Math.sqrt(2) - 1) * 4 / 3;
    SplineBase.call(this, 0, 1 - factor);
}
EllipseAccel.prototype = Object.create(SplineBase.prototype);
EllipseAccel.prototype.constructor = EllipseAccel;

// Elliptic reduction spline class
const EllipseDecel = function() {
    const factor = (Math.sqrt(2) - 1) * 4 / 3;
    SplineBase.call(this, factor, 1);
}
EllipseDecel.prototype = Object.create(SplineBase.prototype);
EllipseDecel.prototype.constructor = EllipseDecel;

