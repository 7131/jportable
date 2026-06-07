// SVG core class
class SvgCore extends jmotion.Core {
    #arms = [];
    #hands = [];

    // constructor
    constructor(svg) {
        super(svg);
        const id = this.svg.id.replace(/\W/g, "\\$&");
        this.#arms = [
            [
                this.svg.querySelector(`#${id}_right_0`),
                this.svg.querySelector(`#${id}_right_1`),
            ],
            [
                this.svg.querySelector(`#${id}_left_0`),
                this.svg.querySelector(`#${id}_left_1`),
            ],
        ];
        this.#hands = [
            this.svg.querySelector(`#${id}_right_hand`),
            this.svg.querySelector(`#${id}_left_hand`),
        ];
        for (const hand of this.#hands) {
            hand.removeAttribute("x");
            hand.removeAttribute("y");
        }
    }

    // change graphic elements
    changeGraphics(body, arms, hands, props) {
        // body
        if (Array.isArray(body)) {
            super.setBody(body);
            body.filter(elem => elem.id).forEach(elem => elem.id = this.#getId(elem.id));
        }

        // arms
        if (Array.isArray(arms)) {
            super.setArms(arms);
            this.#arms = arms;
            const names = this.#getNames(this.#arms.length);
            for (let i = 0; i < this.#arms.length; i++) {
                for (let j = 0; j < this.#arms[i].length; j++) {
                    this.#arms[i][j].id = this.#getId(names[i], j);
                }
            }
        }

        // hands
        if (Array.isArray(hands)) {
            super.setHands(hands);
            this.#hands = hands;
            for (const hand of this.#hands) {
                hand.removeAttribute("x");
                hand.removeAttribute("y");
            }
            const names = this.#getNames(this.#hands.length);
            for (let i = 0; i < this.#hands.length; i++) {
                this.#hands[i].id = this.#getId(names[i], "hand");
            }
        }

        // props
        if (Array.isArray(props)) {
            for (let i = 0; i < props.length; i++) {
                const prop = props[i];
                if (prop.id) {
                    prop.id = this.#getId(prop.id);
                } else {
                    prop.id = this.#getId("prop", i);
                }
            }
            super.setProps(props);
        }
    }

    // set the animation
    animate(orbits) {
        // arms
        const number = Math.min(orbits.arms.length, this.#arms.length);
        for (let i = 0; i < number; i++) {
            // starting with the wrist
            const length = Math.min(orbits.arms[i].length - 1, this.#arms[i].length);
            for (let j = 0; j < length; j++) {
                const element = this.#arms[i][j];
                const arm1 = this.#createNumericChain(element.id, orbits.arms[i][j], "x1", "y1");
                const arm2 = this.#createNumericChain(element.id, orbits.arms[i][j + 1], "x2", "y2");
                this.#appendAnimation(element, arm1, arm2);
            }

            // last joint
            if (length < this.#arms[i].length) {
                const element = this.#arms[i][length];
                const arm1 = this.#createNumericChain(element.id, orbits.arms[i][length], "x1", "y1");
                this.#appendAnimation(element, arm1);
            }
        }

        // hands
        const count = Math.min(orbits.hands.length, this.#hands.length);
        for (let i = 0; i < count; i++) {
            const element = this.#hands[i];
            const hand = orbits.hands[i].setId(element.id);
            let loop = 0;
            while (loop < hand.planes.length && hand.planes[loop] instanceof HaltPlane) {
                loop++;
            }
            hand.setChain(loop);
            this.#appendAnimation(element, hand);
        }

        // props
        super.drawProps(new Array(orbits.props.length).fill(new DOMPoint()));
        const holds = Array.from(new Set(orbits.props.map(elem => elem.paths).flat()));
        holds.sort(this.#compare).forEach(this.defs.appendChild, this.defs);
        const props = this.#getElements(this.middle, "use", "_prop").reverse();
        for (let i = 0; i < props.length; i++) {
            const element = props[i];
            element.removeAttribute("x");
            element.removeAttribute("y");
            const orbit = orbits.props[i];
            const prop = orbit.chain.setId(element.id);
            this.#appendAnimation(element, prop.setChain(orbit.loop));
        }

        // remove unused props
        const defs = this.#getElements(this.defs, "circle", "prop");
        const refs = props.map(elem => elem.getAttribute("href").slice(1));
        defs.filter(elem => !refs.includes(elem.id)).forEach(this.defs.removeChild, this.defs);
    }

    // get the graphic elements
    #getElements(layer, type, key) {
        return Array.from(layer.getElementsByTagName(type)).filter(elem => 0 <= elem.id.indexOf(key));
    }

    // get a list of names
    #getNames(count) {
        switch (count) {
            case 1:
                return [ "arm" ];

            case 2:
                return [ "right", "left" ];

            default:
                return new Array(count).fill().map((val, idx) => idx);
        }
    }

    // get the ID
    #getId(name, postfix) {
        const prefix = `${this.svg.id}_`;
        if (name.startsWith(prefix)) {
            name = name.substring(prefix.length);
        }
        if (postfix == null || postfix === "") {
            return `${prefix}${name}`;
        } else {
            return `${prefix}${name}_${postfix}`;
        }
    }

    // create a chain of numerical planes
    #createNumericChain(name, original, x, y) {
        const plane = new NumericPlane().setDuring(original.x.during);
        plane.setAttribute(x, y).setValues(original.x.values, original.y.values);
        const chain = new PlaneChain().addPlane(plane).setId(`${name}_${x}`);
        chain.begin = original.x.begins[0];
        return chain.setChain();
    }

    // add animation elements
    #appendAnimation(parent, ...chains) {
        chains.forEach(elem => elem.createElements().forEach(parent.appendChild, parent));
    }

    // compare elements
    #compare(a, b) {
        if (a.id == b.id) {
            return 0;
        }
        if (a.id < b.id) {
            return -1;
        } else {
            return 1;
        }
    }

}

// Animation creator class
class AnimCreator extends jmotion.BasicCreator {
    #id = "";
    #tick = 40;
    #scale = 1;
    #unit = this.#tick * 12;

    // set the ID
    setId(value) {
        this.#id = value;
        const paths = [ this.paths.right, this.paths.left ];
        for (let i = 0; i < paths.length; i++) {
            for (let j = 0; j < paths[i].length; j++) {
                for (let k = 0; k < paths[i][j].length; k++) {
                    paths[i][j][k].id = `${value}_orbit_${i}_${k}${j}`;
                }
            }
        }
    }

    // calculate orbits
    calculateOrbits(table, sync) {
        // get a list of coordinates
        const orbits = super.calculateOrbits(table, sync);
        this.#scale = super.getScale();
        const max = this.#scale * 4 + 1;
        const div = Math.round(120 / (max + 5));
        this.#unit = this.#tick * div;

        // orbit of each arm
        const points = this.#roundPoints(orbits.arms);
        const arms = this.#getArms(points);
        const hands = [];
        hands.push(this.#getHand(this.paths.right, false));
        hands.push(this.#getHand(this.paths.left, !sync, points[1][0].loop[0]));

        // orbit of each prop
        const holds = this.#createHolds(arms.map(elem => elem[0]));
        const props = table.map(elem => this.#getProp(elem, holds[0], holds[1], sync));
        return { "arms": arms, "hands": hands, "props": props };
    }

    // round off the coordinate values
    #roundPoints(before) {
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
    }

    // get the arm orbits
    #getArms(orbits) {
        const joints = [];
        for (const arm of orbits) {
            // arm by arm
            const joint = [];
            for (const orbit of arm) {
                // joint by joint
                const init = this.#transpose(orbit.init);
                const loop = this.#transpose(orbit.loop);
                const plane = new NumericPlane();
                plane.addBegin(init.x.length * this.#tick);
                plane.setDuring(loop.x.length * this.#tick);
                plane.setValues(loop.x.concat([ loop.x[0] ]), loop.y.concat([ loop.y[0] ]));
                joint.push(plane);
            }
            joints.push(joint);
        }
        return joints;
    }

    // get the hand orbits
    #getHand(paths, lagged, point) {
        const hand = new PlaneChain();
        if (lagged) {
            // there is a delay in start
            const plane = new HaltPlane().setDuring(this.#unit);
            hand.addPlane(plane.setTo(point));
        }
        for (const joints of paths) {
            // orbit by orbit
            const plane = new MotionPlane().setDuring(this.#unit);
            hand.addPlane(plane.setReferenceId(joints[0].id));
        }
        return hand;
    }

    // create holding orbits for the props
    #createHolds(planes) {
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
                element.setAttribute("id", `${this.#id}_hold_${i}_${j}`);
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
    }

    // get the prop orbits
    #getProp(prop, forward, opposite, sync) {
        const chain = new PlaneChain();
        const paths = new Set();
        const half = this.#unit / 2;

        // before start
        let lag = prop.start % 2;
        if (lag == 1) {
            [ forward, opposite ] = [ opposite, forward ];
            if (!sync) {
                // there is a delay in start
                const halt = new HaltPlane().setDuring(this.#unit);
                chain.addPlane(halt.setTo(forward[0].first));
            }
        }

        // initial operation
        let time = prop.start;
        for (let i = 0; i < time - lag; i++) {
            const hold = forward[i % forward.length];
            paths.add(hold.element);
            const plane = new MotionPlane().setDuring(this.#unit);
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
                    motion.setDuring(this.#unit);
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
                const plane = new MotionPlane().setDuring(this.#unit);
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
                const height = air * air * 15 / this.#scale;

                // animation plane
                const parabola = new ParabolicPlane().setDuring(this.#unit * air);
                parabola.setValues([ from.x, to.x ], [ from.y, from.y - height, to.y ]);
                chain.addPlane(parabola);
            }
            prev = number;
        }
        return { "chain": chain, "loop": loop, "paths": Array.from(paths) };
    }

    // transpose coordinates
    #transpose(points) {
        return { "x": points.map(elem => elem.x), "y": points.map(elem => elem.y) };
    }

}

// Animation plane chain class
class PlaneChain {

    // constructor
    constructor() {
        this.planes = [];
        this.begin = 0;
    }

    // add an animation plane
    addPlane(value) {
        this.planes.push(value);
        return this;
    }

    // set the ID
    setId(value) {
        if (this.planes.length == 1) {
            this.planes[0].setId(value);
        } else {
            for (let i = 0; i < this.planes.length; i++) {
                this.planes[i].setId(value, i);
            }
        }
        return this;
    }

    // set the chain
    setChain(loop) {
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
    }

    // create SVG elements
    createElements() {
        return this.planes.map(elem => elem.createElements()).flat();
    }

}

// Animation part base class
class PartBase {

    // constructor
    constructor(name) {
        this.name = name || "animate";
        this.id = "";
        this.attribute = "";
        this.begins = [];
        this.during = 0;
    }

    // set the ID
    setId(value, postfix) {
        if (postfix == null || postfix === "") {
            this.id = value;
        } else {
            this.id = `${value}_${postfix}`;
        }
        return this;
    }

    // get the ID
    getId() {
        return this.id;
    }

    // add the start timing
    addBegin(value) {
        if (this.begins.indexOf(value) < 0) {
            this.begins.push(value);
        }
        return this;
    }

    // set the duration time (ms)
    setDuring(value) {
        if (isNaN(value) || value < 0) {
            value = 0;
        }
        this.during = value;
        return this;
    }

    // create SVG elements
    createElements() {
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
                begins.push(this.#getTime(element));
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
        element.setAttribute("dur", this.#getTime(this.during));
        return element;
    }

    // get a time string
    #getTime(value) {
        return `${value}ms`;
    }

}

// Halt part class
class HaltPart extends PartBase {

    // constructor
    constructor() {
        super("set");
        this.to = 0;
    }

    // set the value
    setTo(value) {
        if (isNaN(value)) {
            value = 0;
        }
        this.to = value;
        return this;
    }

    // create SVG elements
    createElements() {
        const element = super.createElements();
        element.setAttribute("to", this.to);
        return element;
    }

}

// Value part class
class ValuePart extends PartBase {

    // constructor
    constructor() {
        super();
        this.values = [];
    }

    // set the list of values
    setValues(values) {
        this.values = [];
        if (!Array.isArray(values)) {
            return this;
        }
        this.values = values.filter(elem => !isNaN(elem));
        return this;
    }

    // create SVG elements
    createElements() {
        const element = super.createElements();
        element.setAttribute("values", this.values.join(";"));
        return element;
    }

}

// Parabolic part class
class ParabolicPart extends ValuePart {

    // create SVG elements
    createElements() {
        const element = super.createElements();
        element.setAttribute("calcMode", "spline");
        element.setAttribute("values", this.values.join(";"));
        element.setAttribute("keyTimes", "0;0.5;1");
        element.setAttribute("keySplines", "0.33,0.67 0.67,1;0.33,0 0.67,0.33");
        return element;
    }

}

// Animation plane base class
class PlaneBase {

    // constructor
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    // set the ID
    setId(value, postfix) {
        this.x.setId(value, postfix);
        return this;
    }

    // get the ID
    getId() {
        return this.x.getId();
    }

    // set the operation attribute
    setAttribute(x, y) {
        this.x.attribute = x;
        this.y.attribute = y;
        return this;
    }

    // add the start timing
    addBegin(value) {
        this.x.addBegin(value);
        this.y.addBegin(value);
        return this;
    }

    // set the duration time (ms)
    setDuring(value) {
        this.x.setDuring(value);
        this.y.setDuring(value);
        return this;
    }

    // create SVG elements
    createElements() {
        return [ this.x.createElements(), this.y.createElements() ].flat();
    }

}

// Halt plane class
class HaltPlane extends PlaneBase {

    // constructor
    constructor() {
        super(new HaltPart(), new HaltPart());
        super.setAttribute("x", "y");
    }

    // set the value
    setTo(value) {
        this.x.setTo(value.x);
        this.y.setTo(value.y);
        return this;
    }

}

// Numeric plane class
class NumericPlane extends PlaneBase {

    // constructor
    constructor(x, y) {
        super(x || new ValuePart(), y || new ValuePart());
    }

    // set the list of values
    setValues(xs, ys) {
        this.x.setValues(xs);
        this.y.setValues(ys);
        return this;
    }

}

// Parabolic plane class
class ParabolicPlane extends NumericPlane {

    // constructor
    constructor() {
        super(new ValuePart(), new ParabolicPart());
        super.setAttribute("x", "y");
    }

}

// Motion plane class
class MotionPlane extends PartBase {

    // constructor
    constructor() {
        super("animateMotion");
        this.href = "";
        this.points = [];
    }

    // set the reference ID
    setReferenceId(value) {
        this.href = value;
        return this;
    }

    // set the portion to be used
    setPoints(...values) {
        this.points = values;
        return this;
    }

    // create SVG elements
    createElements() {
        const element = super.createElements();
        const count = this.points.length - 1;
        if (0 < count) {
            // if the part to be used is specified
            const times = new Array(count + 1).fill().map((val, idx) => idx / count);
            element.setAttribute("keyTimes", times.join(";"));
            element.setAttribute("keyPoints", this.points.join(";"));
        }
        const mpath = document.createElementNS(element.namespaseURI, "mpath");
        mpath.setAttribute("href", `#${this.href}`);
        element.appendChild(mpath);
        return element;
    }

}

