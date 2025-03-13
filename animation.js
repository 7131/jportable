// SVG core class
const SvgCore = function(svg) {
    jmotion.Core.call(this, svg);
}

// SVG core prototype
SvgCore.prototype = Object.create(jmotion.Core.prototype, {

    // constructor
    "constructor": { "value": SvgCore },

    // set body elements
    "setBody": { "value": function(elements, append, layer) {
        jmotion.Core.prototype.setBody.call(this, elements, append, layer);
        if (!Array.isArray(elements)) {
            return;
        }

        // set the ID
        for (const element of elements) {
            if (element.id) {
                element.id = this._getId(element.id);
            }
        }
    }},

    // set arm elements
    "setArms": { "value": function(arms, layer) {
        jmotion.Core.prototype.setArms.call(this, arms, layer);
        this._arms = [];
        if (!Array.isArray(arms)) {
            return;
        }
        Array.prototype.push.apply(this._arms, arms);

        // set the ID
        const names = this._getNames(this._arms.length);
        for (let i = 0; i < this._arms.length; i++) {
            for (let j = 0; j < this._arms[i].length; j++) {
                this._arms[i][j].id = this._getId(names[i], j);
            }
        }
    }},

    // set hand elements
    "setHands": { "value": function(elements, layer) {
        jmotion.Core.prototype.setHands.call(this, elements, layer);
        this._hands = [];
        if (!Array.isArray(elements)) {
            return;
        }
        Array.prototype.push.apply(this._hands, elements);
        for (const hand of this._hands) {
            hand.removeAttribute("x");
            hand.removeAttribute("y");
        }

        // set the ID
        const names = this._getNames(this._hands.length);
        for (let i = 0; i < this._hands.length; i++) {
            this._hands[i].id = this._getId(names[i], "hand");
        }
    }},

    // set prop elements
    "setProps": { "value": function(elements) {
        if (Array.isArray(elements)) {
            // IDs are stored internally, so IDs must be set up first
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element.id) {
                    element.id = this._getId(element.id);
                } else {
                    element.id = this._getId("prop", i);
                }
            }
        }
        jmotion.Core.prototype.setProps.call(this, elements);
    }},

    // set the animation
    "animate": { "value": function(orbits) {
        // arms
        const number = Math.min(orbits.arms.length, this._arms.length);
        for (let i = 0; i < number; i++) {
            // starting with the wrist
            const length = Math.min(orbits.arms[i].length - 1, this._arms[i].length);
            for (let j = 0; j < length; j++) {
                const element = this._arms[i][j];
                const arm1 = this._createNumericChain(element.id, orbits.arms[i][j], "x1", "y1");
                const arm2 = this._createNumericChain(element.id, orbits.arms[i][j + 1], "x2", "y2");
                this._appendAnimation(element, arm1, arm2);
            }

            // last joint
            if (length < this._arms[i].length) {
                const element = this._arms[i][length];
                const arm1 = this._createNumericChain(element.id, orbits.arms[i][length], "x1", "y1");
                this._appendAnimation(element, arm1);
            }
        }

        // hands
        const count = Math.min(orbits.hands.length, this._hands.length);
        for (let i = 0; i < count; i++) {
            const element = this._hands[i];
            const hand = orbits.hands[i].setId(element.id);
            let loop = 0;
            while (loop < hand.planes.length && hand.planes[loop] instanceof HaltPlane) {
                loop++;
            }
            hand.setChain(loop);
            this._appendAnimation(element, hand);
        }

        // props
        this.drawProps(new Array(orbits.props.length).fill(new DOMPoint()));
        const holds = Array.from(new Set(orbits.props.map(elem => elem.paths).flat()));
        holds.sort(this._compare.bind(this)).forEach(this.defs.appendChild, this.defs);
        const props = this._getElements(this.middle, "use", "_prop").reverse();
        for (let i = 0; i < props.length; i++) {
            const element = props[i];
            element.removeAttribute("x");
            element.removeAttribute("y");
            const orbit = orbits.props[i];
            const prop = orbit.chain.setId(element.id);
            this._appendAnimation(element, prop.setChain(orbit.loop));
        }

        // remove unused props
        const defs = this._getElements(this.defs, "circle", "prop");
        const refs = props.map(elem => elem.getAttribute("href").slice(1));
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

    // get a list of names
    "_getNames": { "value": function(count) {
        switch (count) {
            case 1:
                return [ "arm" ];

            case 2:
                return [ "right", "left" ];

            default:
                const names = [];
                for (let i = 0; i < count; i++) {
                    names.push(i);
                }
                return names;
        }
    }},

    // get the ID
    "_getId": { "value": function(name, postfix) {
        const prefix = `${this.svg.id}_`;
        if (name.startsWith(prefix)) {
            name = name.substring(prefix.length);
        }
        if (postfix == null || postfix === "") {
            return `${prefix}${name}`;
        } else {
            return `${prefix}${name}_${postfix}`;
        }
    }},

    // create a chain of numerical planes
    "_createNumericChain": { "value": function(name, original, x, y) {
        const plane = new NumericPlane().setDuring(original.x.during);
        plane.setAttribute(x, y).setValues(original.x.values, original.y.values);
        const chain = new PlaneChain().addPlane(plane).setId(`${name}_${x}`);
        chain.begin = original.x.begins[0];
        return chain.setChain();
    }},

    // add animation elements
    "_appendAnimation": { "value": function(parent, ...chains) {
        for (const chain of chains) {
            chain.createElements().forEach(parent.appendChild, parent);
        }
    }},

    // compare elements
    "_compare": { "value": function(a, b) {
        if (a.id == b.id) {
            return 0;
        }
        if (a.id < b.id) {
            return -1;
        } else {
            return 1;
        }
    }},

});

// Animation creator class
const AnimCreator = function() {
    jmotion.BasicCreator.call(this);
    this._id = "";
    this._tick = 40;
    this._scale = 1;
    this._unit = this._tick * 12;
}

// Animation creator prototype
AnimCreator.prototype = Object.create(jmotion.BasicCreator.prototype, {

    // constructor
    "constructor": { "value": AnimCreator },

    // set the ID
    "setId": { "value": function(value) {
        this._id = value;
        const paths = [ this.paths.right, this.paths.left ];
        for (let i = 0; i < paths.length; i++) {
            for (let j = 0; j < paths[i].length; j++) {
                for (let k = 0; k < paths[i][j].length; k++) {
                    paths[i][j][k].id = `${value}_orbit_${i}_${k}${j}`;
                }
            }
        }
    }},

    // calculate orbits
    "calculateOrbits": { "value": function(table, sync) {
        // get a list of coordinates
        const orbits = jmotion.BasicCreator.prototype.calculateOrbits.call(this, table, sync);
        this._scale = this.getScale();
        const max = this._scale * 4 + 1;
        const div = Math.round(120 / (max + 5));
        this._unit = this._tick * div;

        // orbit of each arm
        const points = this._roundPoints(orbits.arms);
        const arms = this._getArms(points);
        const hands = [];
        hands.push(this._getHand(this.paths.right, false));
        hands.push(this._getHand(this.paths.left, !sync, points[1][0].loop[0]));

        // orbit of each prop
        const holds = this._createHolds(arms.map(elem => elem[0]));
        const props = [];
        for (const prop of table) {
            props.push(this._getProp(prop, holds[0], holds[1], sync));
        }
        return { "arms": arms, "hands": hands, "props": props };
    }},

    // round off the coordinate values
    "_roundPoints": { "value": function(before) {
        const after = [];
        for (const joints of before) {
            const part = [];
            for (const joint of joints) {
                const loop = [];
                for (const point of joint.loop) {
                    const x = Math.round(point.x * 100) / 100;
                    const y = Math.round(point.y * 100) / 100;
                    loop.push({ "x": x, "y": y });
                }
                part.push({ "init": joint.init, "loop": loop });
            }
            after.push(part);
        }
        return after;
    }},

    // get the arm orbits
    "_getArms": { "value": function(orbits) {
        const joints = [];
        for (const arm of orbits) {
            // arm by arm
            const joint = [];
            for (const orbit of arm) {
                // joint by joint
                const init = this._transpose(orbit.init);
                const loop = this._transpose(orbit.loop);
                const plane = new NumericPlane();
                plane.addBegin(init.x.length * this._tick);
                plane.setDuring(loop.x.length * this._tick);
                plane.setValues(loop.x.concat([ loop.x[0] ]), loop.y.concat([ loop.y[0] ]));
                joint.push(plane);
            }
            joints.push(joint);
        }
        return joints;
    }},

    // get the hand orbits
    "_getHand": { "value": function(paths, lagged, point) {
        const hand = new PlaneChain();
        if (lagged) {
            // there is a delay in start
            const plane = new HaltPlane().setDuring(this._unit);
            hand.addPlane(plane.setTo(point));
        }
        for (const joints of paths) {
            // orbit by orbit
            const plane = new MotionPlane().setDuring(this._unit);
            hand.addPlane(plane.setReferenceId(joints[0].id));
        }
        return hand;
    }},

    // create holding orbits for the props
    "_createHolds": { "value": function(planes) {
        const offset = [ this.offset.right, this.offset.left ];
        const holds = [];
        for (let i = 0; i < planes.length; i++) {
            const plane = planes[i];
            const end = plane.x.values.length - 1;
            const mid = end / 2;
            const hold = [];
            for (let j = 0; j < 2; j++) {
                const start = mid * j;

                // coordinates to string
                const points = [];
                for (let k = 0; k <= mid; k++) {
                    const index = start + k;
                    const x = Math.round((plane.x.values[index] + offset[i].x) * 100) / 100;
                    const y = Math.round((plane.y.values[index] + offset[i].y) * 100) / 100;
                    points.push(`${x},${y}`);
                }

                // create a path element
                const element = document.createElementNS("http://www.w3.org/2000/svg", "path");
                element.setAttribute("id", `${this._id}_hold_${i}_${j}`);
                element.setAttribute("d", `M ${points.join(" L ")}`);

                // holding orbit
                const length = element.getTotalLength();
                const first = element.getPointAtLength(0);
                const middle = element.getPointAtLength(length / 2);
                const last = element.getPointAtLength(length);
                hold.push({ "element": element, "id": element.id, "first": first, "middle": middle, "last": last });
            }
            holds.push(hold);
        }
        return holds;
    }},

    // get the prop orbits
    "_getProp": { "value": function(prop, forward, opposite, sync) {
        const chain = new PlaneChain();
        const paths = new Set();
        const half = this._unit / 2;

        // before start
        let lag = prop.start % 2;
        if (lag == 1) {
            [ forward, opposite ] = [ opposite, forward ];
            if (!sync) {
                // there is a delay in start
                const halt = new HaltPlane().setDuring(this._unit);
                chain.addPlane(halt.setTo(forward[0].first));
            }
        }

        // initial operation
        let time = prop.start;
        for (let i = 0; i < time - lag; i++) {
            const hold = forward[i % forward.length];
            paths.add(hold.element);
            const plane = new MotionPlane().setDuring(this._unit);
            chain.addPlane(plane.setReferenceId(hold.id));
        }

        // tweak
        let prev = prop.numbers[prop.length - 1];
        if (prev == 1) {
            const hold = forward[time % forward.length];
            paths.add(hold.element);
            const plane = new MotionPlane().setDuring(half).setPoints(0, 0.5);
            chain.addPlane(plane.setReferenceId(hold.id));
        }
        const loop = chain.planes.length;

        // repetitive motion
        let index = (time - lag) % forward.length;
        for (let i = 0; i < prop.numbers.length; i++) {
            const number = prop.numbers[i];

            // an orbit from catch to throw
            const hold = forward[index];
            const motion = new MotionPlane();
            let from = hold.last;
            if (number == 1) {
                from = hold.middle;
                if (prev != 1) {
                    motion.setDuring(half).setPoints(0, 0.5);
                }
            } else {
                if (prev == 1) {
                    motion.setDuring(half).setPoints(0.5, 1);
                } else {
                    motion.setDuring(this._unit);
                }
            }
            if (number != 1 || prev != 1) {
                paths.add(hold.element);
                chain.addPlane(motion.setReferenceId(hold.id));
            }

            // parabolic orbit from throw to catch
            if (number == 2) {
                const ret = forward[(index + 1) % forward.length];
                paths.add(ret.element);
                const plane = new MotionPlane().setDuring(this._unit);
                chain.addPlane(plane.setReferenceId(ret.id));
            } else {
                if (prop.times[i] % 2 == 1) {
                    // when throwing to the opposite hand
                    [ forward, opposite ] = [ opposite, forward ];
                    if (!sync) {
                        lag = 1 - lag;
                    }
                }
                const abs = Math.abs(number);
                time += abs;
                index = (time - lag) % forward.length;
                let to = forward[index].first;
                if (number == 1) {
                    to = forward[index].middle;
                }
                const air = Math.max(1, abs - 1);
                const height = air * air * 15 / this._scale;

                // animation plane
                const parabola = new ParabolicPlane().setDuring(this._unit * air);
                parabola.setValues([ from.x, to.x ], [ from.y, from.y - height, to.y ]);
                chain.addPlane(parabola);
            }
            prev = number;
        }
        return { "chain": chain, "loop": loop, "paths": Array.from(paths) };
    }},

    // transpose coordinates
    "_transpose": { "value": function(points) {
        const xs = [];
        const ys = [];
        if (0 < points.length) {
            Array.prototype.push.apply(xs, points.map(elem => elem.x))
            Array.prototype.push.apply(ys, points.map(elem => elem.y))
        }
        return { "x": xs, "y": ys };
    }},

});

// Animation plane chain class
const PlaneChain = function() {
    this.planes = [];
    this.begin = 0;
}

// Animation plane chain prototype
PlaneChain.prototype = {

    // add an animation plane
    "addPlane": function(value) {
        this.planes.push(value);
        return this;
    },

    // set the ID
    "setId": function(value) {
        if (this.planes.length == 1) {
            this.planes[0].setId(value);
        } else {
            for (let i = 0; i < this.planes.length; i++) {
                this.planes[i].setId(value, i);
            }
        }
        return this;
    },

    // set the chain
    "setChain": function(loop) {
        const last = this.planes.length - 1;
        if (last < 0) {
            return this;
        }
        this.planes[0].addBegin(this.begin);

        // set the order from the top
        for (let i = 0; i < last; i++) {
            this.planes[i + 1].addBegin(this.planes[i]);
        }

        // repeat
        if (isNaN(loop)) {
            loop = 0;
        }
        this.planes[loop].addBegin(this.planes[last]);
        return this;
    },

    // create SVG elements
    "createElements": function() {
        return this.planes.map(elem => elem.createElements()).flat();
    },

}

// Animation part base class
const PartBase = function(name) {
    this.name = name || "animate";
    this.id = "";
    this.attribute = "";
    this.begins = [];
    this.during = 0;
}

// Animation part base prototype
PartBase.prototype = {

    // set the ID
    "setId": function(value, postfix) {
        if (postfix == null || postfix === "") {
            this.id = value;
        } else {
            this.id = `${value}_${postfix}`;
        }
        return this;
    },

    // get the ID
    "getId": function() {
        return this.id;
    },

    // add the start timing
    "addBegin": function(value) {
        if (this.begins.indexOf(value) < 0) {
            this.begins.push(value);
        }
        return this;
    },

    // set the duration time (ms)
    "setDuring": function(value) {
        if (isNaN(value) || value < 0) {
            value = 0;
        }
        this.during = value;
        return this;
    },

    // create SVG elements
    "createElements": function() {
        // start timing
        const begins = [];
        for (const element of this.begins) {
            if (isNaN(element)) {
                if (typeof element.getId === "function") {
                    begins.push(`${element.getId()}.end`);
                } else {
                    begins.push(element);
                }
            } else {
                begins.push(this._getTime(element));
            }
        }

        // create an animation element
        const element = document.createElementNS("http://www.w3.org/2000/svg", this.name);
        if (this.id) {
            element.setAttribute("id", this.id);
        }
        if (this.attribute) {
            element.setAttribute("attributeName", this.attribute);
        }
        element.setAttribute("begin", begins.join(";"));
        element.setAttribute("dur", this._getTime(this.during));
        return element;
    },

    // get a time string
    "_getTime": function(value) {
        return `${value}ms`;
    },

}

// Halt part class
const HaltPart = function() {
    PartBase.call(this, "set");
    this.to = 0;
}

// Halt part prototype
HaltPart.prototype = Object.create(PartBase.prototype, {

    // constructor
    "constructor": { "value": HaltPart },

    // set the value
    "setTo": { "value": function(value) {
        if (isNaN(value)) {
            value = 0;
        }
        this.to = value;
        return this;
    }},

    // create SVG elements
    "createElements": { "value": function() {
        const element = PartBase.prototype.createElements.call(this);
        element.setAttribute("to", this.to);
        return element;
    }},

});

// Value part class
const ValuePart = function() {
    PartBase.call(this);
    this.values = [];
}

// Value part prototype
ValuePart.prototype = Object.create(PartBase.prototype, {

    // constructor
    "constructor": { "value": ValuePart },

    // set the list of values
    "setValues": { "value": function(values) {
        this.values = [];
        if (!Array.isArray(values)) {
            return this;
        }
        Array.prototype.push.apply(this.values, values.filter(elem => !isNaN(elem)));
        return this;
    }},

    // create SVG elements
    "createElements": { "value": function() {
        const element = PartBase.prototype.createElements.call(this);
        element.setAttribute("values", this.values.join(";"));
        return element;
    }},

});

// Parabolic part class
const ParabolicPart = function() {
    ValuePart.call(this);
}

// Parabolic part prototype
ParabolicPart.prototype = Object.create(ValuePart.prototype, {

    // constructor
    "constructor": { "value": ParabolicPart },

    // create SVG elements
    "createElements": { "value": function() {
        const element = PartBase.prototype.createElements.call(this);
        element.setAttribute("calcMode", "spline");
        element.setAttribute("values", this.values.join(";"));
        element.setAttribute("keyTimes", "0;0.5;1");
        element.setAttribute("keySplines", "0.33,0.67 0.67,1;0.33,0 0.67,0.33");
        return element;
    }},

});

// Animation plane base class
const PlaneBase = function(x, y) {
    this.x = x;
    this.y = y;
}

// Animation plane base prototype
PlaneBase.prototype = {

    // set the ID
    "setId": function(value, postfix) {
        this.x.setId(value, postfix);
        return this;
    },

    // get the ID
    "getId": function() {
        return this.x.getId();
    },

    // set the operation attribute
    "setAttribute": function(x, y) {
        this.x.attribute = x;
        this.y.attribute = y;
        return this;
    },

    // add the start timing
    "addBegin": function(value) {
        this.x.addBegin(value);
        this.y.addBegin(value);
        return this;
    },

    // set the duration time (ms)
    "setDuring": function(value) {
        this.x.setDuring(value);
        this.y.setDuring(value);
        return this;
    },

    // create SVG elements
    "createElements": function() {
        return [ this.x.createElements(), this.y.createElements() ].flat();
    },

}

// Halt plane class
const HaltPlane = function() {
    PlaneBase.call(this, new HaltPart(), new HaltPart());
    this.setAttribute("x", "y");
}

// Halt plane prototype
HaltPlane.prototype = Object.create(PlaneBase.prototype, {

    // constructor
    "constructor": { "value": HaltPlane },

    // set the value
    "setTo": { "value": function(value) {
        this.x.setTo(value.x);
        this.y.setTo(value.y);
        return this;
    }},

});

// Numeric plane class
const NumericPlane = function(x, y) {
    PlaneBase.call(this, x || new ValuePart(), y || new ValuePart());
}

// Numeric plane prototype
NumericPlane.prototype = Object.create(PlaneBase.prototype, {

    // constructor
    "constructor": { "value": NumericPlane },

    // set the list of values
    "setValues": { "value": function(xs, ys) {
        this.x.setValues(xs);
        this.y.setValues(ys);
        return this;
    }},

});

// Parabolic plane class
const ParabolicPlane = function() {
    NumericPlane.call(this, new ValuePart(), new ParabolicPart());
    this.setAttribute("x", "y");
}

// Parabolic plane prototype
ParabolicPlane.prototype = Object.create(NumericPlane.prototype, {

    // constructor
    "constructor": { "value": ParabolicPlane },

});

// Motion plane class
const MotionPlane = function() {
    PartBase.call(this, "animateMotion");
    this.href = "";
    this.points = [];
}

// Motion plane prototype
MotionPlane.prototype = Object.create(PartBase.prototype, {

    // constructor
    "constructor": { "value": MotionPlane },

    // set the reference ID
    "setReferenceId": { "value": function(value) {
        this.href = value;
        return this;
    }},

    // set the portion to be used
    "setPoints": { "value": function(...values) {
        this.points = [];
        Array.prototype.push.apply(this.points, values);
        return this;
    }},

    // create SVG elements
    "createElements": { "value": function() {
        const element = PartBase.prototype.createElements.call(this);
        const count = this.points.length - 1;
        if (0 < count) {
            // if the part to be used is specified
            const times = [];
            for (let i = 0; i < count; i++) {
                times.push(i / count);
            }
            times.push(1);
            element.setAttribute("keyTimes", times.join(";"));
            element.setAttribute("keyPoints", this.points.join(";"));
        }
        const mpath = document.createElementNS(element.namespaseURI, "mpath");
        mpath.setAttribute("href", `#${this.href}`);
        element.appendChild(mpath);
        return element;
    }},

});

