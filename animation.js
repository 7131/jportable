// SVG core class
class SvgCore extends jmotion.Core {
    #arms;
    #hands;

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
            this.props = props;
        }
    }

    // set the animation
    animate(orbits, rotation) {
        let number = parseFloat(rotation);
        if (isNaN(number)) {
            number = 0;
        }

        // arms
        const min = Math.min(orbits.arms.length, this.#arms.length);
        for (let i = 0; i < min; i++) {
            // starting with the wrist
            const length = Math.min(orbits.arms[i].length - 1, this.#arms[i].length);
            for (let j = 0; j < length; j++) {
                const element = this.#arms[i][j];
                const arm1 = this.#createArmChain(element, orbits.arms[i][j], "x1", "y1");
                const arm2 = this.#createArmChain(element, orbits.arms[i][j + 1], "x2", "y2");
                this.#appendAnimation(element, arm1, arm2);
            }

            // last joint
            if (length < this.#arms[i].length) {
                const element = this.#arms[i][length];
                const arm1 = this.#createArmChain(element, orbits.arms[i][length], "x1", "y1");
                this.#appendAnimation(element, arm1);
            }
        }

        // hands
        const count = Math.min(orbits.hands.length, this.#hands.length);
        for (let i = 0; i < count; i++) {
            const element = this.#hands[i];
            this.#appendAnimation(element, orbits.hands[i].setId(element.id).setChain(0));
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
            this.#appendAnimation(element, orbits.props[i].chain.setId(element.id).setChain(0));
        }

        // rotation settings
        const rots = this.#appendRotation(this.defs, props);
        if (number != 0) {
            for (let i = 0; i < rots.length; i++) {
                const chain = new PlaneChain();
                const throws = orbits.props[i].chain.getPlanes(ParabolicPlane);
                for (const x of throws.map(elem => elem.getX())) {
                    const trans = new TransformPlane().setBegins(x.getBegins()).setDuring(x.getDuring());
                    const round = Math.floor(x.getDuring() / orbits.unit / 2) * number;
                    chain.addPlane(trans.setTo(Math.sign(x.getValues()[0]) * 360 * round));
                }
                this.#appendAnimation(rots[i], chain);
            }
        }

        // remove unused props
        const defs = this.#getElements(this.defs, "circle", "prop");
        const refs = rots.map(elem => elem.getAttribute("href").slice(1));
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

    // create a chain of arm planes
    #createArmChain(element, original, x, y) {
        const chain = new PlaneChain();
        const ox = original.getX();
        const oy = original.getY();
        const xs = ox.getValues();
        const ys = oy.getValues();
        if (xs.length == 0 || ys.length == 0) {
            return chain;
        }

        // check whether all the coordinates are the same
        let plane;
        if (xs.every(elem => elem == xs[0]) && ys.every(elem => elem == ys[0])) {
            if (xs[0] == parseFloat(element.getAttribute(x)) && ys[0] == parseFloat(element.getAttribute(y))) {
                return chain;
            }
            plane = new HaltPlane().setTo({ "x": xs[0], "y": ys[0] });
        } else {
            plane = new NumericPlane().setValues(xs, ys);
        }
        plane.setDuring(ox.getDuring()).setAttribute(x, y);
        chain.addPlane(plane);
        return chain.setId(`${element.id}_${x}`).setChain(ox.getBegins()[0]);
    }

    // add animation elements
    #appendAnimation(parent, ...chains) {
        chains.forEach(elem => elem.generateElements().forEach(parent.appendChild, parent));
    }

    // add rotation elements
    #appendRotation(parent, elements) {
        const rotations = [];
        for (const element of elements) {
            const id = `${element.id}_rot`;
            const rotation = document.createElementNS("http://www.w3.org/2000/svg", "use");
            rotation.setAttribute("id", id);
            rotation.setAttribute("href", element.getAttribute("href"));
            parent.appendChild(rotation);
            rotations.push(rotation);
            element.setAttribute("href", `#${id}`);
        }
        return rotations;
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

// Animation generator class
class AnimGenerator extends jmotion.CalmGenerator {
    #id = "";
    #tick = 40;
    #div = 12;
    #unit = this.#tick * this.#div;

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
    calculateOrbits(table, sync, throws) {
        // get a list of coordinates
        const orbits = super.calculateOrbits(table, sync, throws);
        const max = this.scale * 4 + 1;
        this.#div = Math.round(120 / (max + 5));
        this.#unit = this.#tick * this.#div;

        // orbit of each arm
        const points = this.#roundPoints(orbits.arms);
        const arms = this.#getArms(points);
        const timing = this.#generateTimings(throws, sync);
        const hands = [];
        hands.push(this.#getHand(this.paths.right, timing, 0, false, points));
        hands.push(this.#getHand(this.paths.left, timing, 1, !sync, points));

        // orbit of each prop
        const holds = this.#generateHolds(arms.map(elem => elem[0]));
        const props = table.map(elem => this.#getProp(elem, holds[0], holds[1], timing, sync));
        return { "arms": arms, "hands": hands, "props": props, "unit": this.#unit };
    }

    // round off the coordinate values
    #roundPoints(before) {
        const after = [];
        for (const joints of before) {
            const part = [];
            for (const joint of joints) {
                const loop = [];
                for (const point of joint.loop) {
                    loop.push({ "x": Math.round(point.x * 100) / 100, "y": Math.round(point.y * 100) / 100 });
                }
                part.push({ "init": joint.init, "loop": loop });
            }
            after.push(part);
        }
        return after;
    }

    // generate the timing for the throw
    #generateTimings(throws, sync) {
        const timing = new Array(throws.length).fill().map(() => []);
        for (let i = 0; i < throws.length; i++) {
            for (const number of throws[i]) {
                if (0 < number) {
                    if (sync && number % 2 == 1) {
                        timing[i].push(-(number + (i % 2) * 2 - 1));
                    } else {
                        timing[i].push(number);
                    }
                }
            }
        }
        if (throws.length % 2 == 0) {
            return timing;
        }
        return timing.concat(timing);
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
                const plane = new NumericPlane().addBegin(init.x.length * this.#tick).setDuring(loop.x.length * this.#tick);
                joint.push(plane.setValues(loop.x.concat([ loop.x[0] ]), loop.y.concat([ loop.y[0] ])));
            }
            joints.push(joint);
        }
        return joints;
    }

    // get the hand orbits
    #getHand(paths, timing, lag, gap, points) {
        const ids = paths.map(elem => elem[0].id);
        const calm = points[lag][0].loop[0];
        const chain = new PlaneChain();
        if (gap) {
            // there is a delay in start
            chain.addHaltPlane(this.#unit, calm);
        }
        chain.startLoop();

        // repetitive motion
        const loop = [];
        for (let i = lag; i < timing.length; i += 2) {
            if (timing[i].some(elem => elem != 2)) {
                loop.push("busy");
            } else if (timing[(i - 1 + timing.length) % timing.length].some(elem => elem == 1)) {
                loop.push("zip");
            } else {
                loop.push("calm");
            }
        }

        // remove duplicates
        const period = loop.length;
        let stride = 1;
        let result = loop;
        while (result == loop && stride <= period / 2) {
            if (period % stride == 0) {
                const unit = loop.slice(0, stride);
                let valid = true;
                let start = stride;
                while (valid && start < period) {
                    valid = unit.every((val, idx) => val == loop[start + idx]);
                    start += stride;
                }
                if (valid) {
                    result = unit;
                }
            }
            stride++;
        }

        // get the coordinates
        const half = this.#unit / 2;
        const double = this.#unit * 2;
        for (const text of result) {
            switch (text) {
                case "busy":
                    for (const id of ids) {
                        chain.addMotionPlane(id, this.#unit);
                    }
                    break;
                case "zip":
                    chain.addMotionPlane(ids[0], half, [ 0, 0.5 ]);
                    chain.addMotionPlane(ids[0], half, [ 0.5, 0 ]);
                    chain.addHaltPlane(this.#unit, calm);
                    break;
                default:
                    chain.addHaltPlane(double, calm);
                    break;
            }
        }
        return chain;
    }

    // generate holding orbits for the props
    #generateHolds() {
        const moves = [ this.paths.right, this.paths.left ];
        const offset = [ this.offset.right, this.offset.left ];
        const holds = [];
        for (let i = 0; i < moves.length; i++) {
            const hold = [];
            for (let j = 0; j < moves[i].length; j++) {
                const path = moves[i][j][0];

                // get the coordinates
                const points = [];
                const delta = path.getTotalLength() / this.#div;
                let distance = 0;
                for (let k = 0; k <= this.#div; k++) {
                    points.push(path.getPointAtLength(distance));
                    distance += delta;
                }

                // coordinates to string
                const texts = [];
                for (const point of points) {
                    const x = Math.round((point.x + offset[i].x) * 100) / 100;
                    const y = Math.round((point.y + offset[i].y) * 100) / 100;
                    texts.push(`${x},${y}`);
                }

                // create a path element
                const element = document.createElementNS("http://www.w3.org/2000/svg", "path");
                element.setAttribute("id", `${this.#id}_hold_${i}_${j}`);
                element.setAttribute("d", `M ${texts.join(" L ")}`);

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
    #getProp(prop, right, left, timing, sync) {
        const chain = new PlaneChain();
        const paths = new Set();
        const half = this.#unit / 2;
        let forward = right;
        let opposite = left;

        // before start
        let lag = prop.start % 2;
        if (lag == 1) {
            [ forward, opposite ] = [ opposite, forward ];
            if (!sync) {
                // there is a delay in start
                chain.addHaltPlane(this.#unit, forward[0].first);
            }
        }

        // initial operation
        let time = prop.start;
        let tick = time;
        for (let i = 0; i < time - lag; i++) {
            const curr = i - i % 2 + lag;
            const busy = timing[curr % timing.length].some(elem => elem != 2);
            const zip = timing[(curr - 1 + timing.length) % timing.length].some(elem => elem == 1);
            const pos = i % forward.length;
            if (busy) {
                const hold = forward[pos];
                paths.add(hold.element);
                chain.addMotionPlane(hold.id, this.#unit);
            } else if (zip && pos == 0) {
                const hold = forward[pos];
                paths.add(hold.element);
                chain.addMotionPlane(hold.id, half, [ 0, 0.5 ]);
                chain.addMotionPlane(hold.id, half, [ 0.5, 0 ]);
            } else {
                chain.addHaltPlane(this.#unit, forward[0].first);
            }
        }

        // tweak
        let prev = prop.numbers[prop.length - 1];
        if (prev == 1) {
            const hold = forward[time % forward.length];
            paths.add(hold.element);
            chain.addMotionPlane(hold.id, half, [ 0, 0.5 ]);
        }
        chain.startLoop();

        // repetitive motion
        let index = (time - lag) % forward.length;
        for (let i = 0; i < prop.numbers.length; i++) {
            const number = prop.numbers[i];
            const busy = timing[tick % timing.length].some(elem => elem != 2);
            const zip = timing[(tick - 1 + timing.length) % timing.length].some(elem => elem == 1);

            // an orbit from catch to throw
            const motion = new MotionPlane();
            const hold = forward[index];
            let from = hold.last;
            if (number == 1) {
                if (prev != 1) {
                    motion.setDuring(half).setPoints([ 0, 0.5 ]);
                }
                from = hold.middle;
            } else {
                if (prev == 1) {
                    if (busy) {
                        motion.setDuring(half).setPoints([ 0.5, 1 ]);
                    } else {
                        motion.setDuring(half).setPoints([ 0.5, 0 ]);
                    }
                } else {
                    if (busy || zip) {
                        motion.setDuring(this.#unit);
                    } else {
                        chain.addHaltPlane(this.#unit, hold.first);
                    }
                }
            }
            if (0 < motion.getDuring()) {
                paths.add(hold.element);
                chain.addPlane(motion.setReferenceId(hold.id));
            }

            // parabolic orbit from throw to catch
            if (number == 2) {
                if (busy) {
                    const ret = forward[(index + 1) % forward.length];
                    paths.add(ret.element);
                    chain.addMotionPlane(ret.id, this.#unit);
                } else {
                    chain.addHaltPlane(this.#unit, hold.first);
                }
                time += number;
                tick += number;
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
                tick += prop.times[i];
                index = (time - lag) % forward.length;
                let to = forward[index].first;
                if (number == 1) {
                    to = forward[index].middle;
                }
                const air = Math.max(1, abs - 1);
                const height = air * air * 15 / this.scale;

                // animation plane
                const parabola = new ParabolicPlane().setDuring(this.#unit * air);
                parabola.setValues([ from.x, to.x ], [ from.y, from.y - height, to.y ]);
                chain.addPlane(parabola);
            }
            prev = number;
        }
        return { "chain": chain, "paths": Array.from(paths) };
    }

    // transpose coordinates
    #transpose(points) {
        return { "x": points.map(elem => elem.x), "y": points.map(elem => elem.y) };
    }

}

