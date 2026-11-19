"""Build js/exercises-lib.js: the full kettlebell exercise library (Caveman Kettlebells list of exercises and variations).

Each variation/version becomes an exercise with category, muscles, level, lower-back load, floor flag, equipment
(1 or 2 kettlebells), the closest existing animation and generic coaching cues for its family.
Run: python3 dev/build_library.py
"""
import json, re

S, SA, D1, D2, ALT = 'S', 'SA', 'D1', 'D2', 'ALT'
SUFFIX = {S: 'single arm', SA: 'alternating', D1: 'two hands', D2: 'two kettlebells', ALT: 'alternating'}

# family defaults: cat, region, muscles, anim, back(0-2), level, floor, cues
FAM = {
    'swing': dict(cat='ballistic', region='lower', muscles=['glutes', 'hamstrings', 'core', 'cardio'], anim='swing2', back=2, level=2,
                  cues=['Hinge at the hips, flat back, bell hiked back between the legs.', 'Snap the hips forward and let the bell float; arms just guide.', 'Brace the core at the top and let the bell fall back into the hinge.']),
    'clean': dict(cat='ballistic', region='total', muscles=['glutes', 'back', 'arms', 'grip'], anim='clean', back=2, level=2,
                  cues=['Start from a hinge, keep the elbow close to the body.', 'Drive with the hips and guide the bell into the rack without banging the forearm.', 'Finish tall: elbow on the ribs, wrist straight, glutes tight.']),
    'squat': dict(cat='squat', region='lower', muscles=['quads', 'glutes', 'core'], anim='goblet', back=1, level=2,
                  cues=['Feet about shoulder-width, chest up, brace the core.', 'Sit down between the knees, knees tracking over the toes.', 'Drive up through the whole foot.']),
    'press': dict(cat='push', region='upper', muscles=['shoulders', 'triceps', 'core'], anim='press', back=0, level=2,
                  cues=['Start from a solid rack, glutes and abs tight.', 'Press in a straight line until the arm is locked out.', 'Lower under control back to the start.']),
    'curl': dict(cat='arms', region='upper', muscles=['biceps', 'forearms'], anim='curl', back=0, level=1,
                 cues=['Elbows pinned to your sides, stand tall.', 'Curl the bell up without swinging the body.', 'Lower slowly.']),
    'getup': dict(cat='total', region='total', muscles=['shoulders', 'core', 'glutes', 'mobility'], anim='tgu', back=1, level=3, floor=True,
                  cues=['Bell locked out overhead, eyes on it the whole time.', 'Move step by step from lying to standing and back.', 'Slow and controlled; use a light bell to learn.']),
    'snatch': dict(cat='ballistic', region='total', muscles=['glutes', 'shoulders', 'back', 'cardio'], anim='snatch', back=2, level=3,
                   cues=['Powerful hip drive from a hinge.', 'Pull the elbow high and punch through so the bell lands softly overhead.', 'Lock out, then let it drop back into the hinge.']),
    'jerk': dict(cat='push', region='total', muscles=['shoulders', 'triceps', 'quads'], anim='pushPress', back=1, level=3,
                 cues=['From the rack, dip and drive with the legs.', 'Drop under the bell to lock it out, then stand tall.', 'Lower back to the rack under control.']),
    'windmill': dict(cat='core', region='core', muscles=['obliques', 'shoulders', 'hamstrings'], anim='windmill', back=2, level=3,
                     cues=['Bell locked out overhead, eyes on it.', 'Push the hip out and hinge sideways, free hand sliding down the leg.', 'The top arm stays vertical; come back up slowly.']),
    'kneeling': dict(cat='lunge', region='lower', muscles=['quads', 'glutes', 'core'], anim='halfKneelPress', back=1, level=2, floor=True,
                     cues=['Hold the bell racked, kneel down one knee at a time.', 'Stand back up one leg at a time with a tall torso.', 'Use a soft surface under the knees.']),
    'lunge': dict(cat='lunge', region='lower', muscles=['quads', 'glutes', 'balance'], anim='lunge', back=1, level=2,
                  cues=['Long step, lower straight down, back knee close to the floor.', 'Front knee over the ankle, torso tall.', 'Push through the front heel to return.']),
    'lift': dict(cat='hinge', region='lower', muscles=['glutes', 'hamstrings', 'back'], anim='deadlift', back=1, level=1,
                 cues=['Bell close to the body, flat back, brace the core.', 'Push the floor away and stand tall, squeezing the glutes.', 'Lower with the same flat back.']),
    'row': dict(cat='pull', region='upper', muscles=['back', 'biceps', 'rear delts'], anim='row', back=1, level=2,
                cues=['Flat back, shoulders down.', 'Pull the elbow toward the hip.', 'Pause, then lower under control.']),
    'highpull': dict(cat='pull', region='total', muscles=['back', 'shoulders', 'glutes'], anim='highPull', back=2, level=2,
                     cues=['Drive with the hips from a hinge.', 'Pull the elbow high, bell finishes around chest height.', 'Let it swing back into the hinge.']),
    'halo': dict(cat='core', region='core', muscles=['shoulders', 'core', 'mobility'], anim='halo', back=0, level=1,
                 cues=['Hold the bell by the horns, close to the head.', 'Circle it slowly around the head.', 'Brace the abs; switch direction halfway.']),
    'carry': dict(cat='total', region='total', muscles=['core', 'grip', 'shoulders'], anim='carry', back=1, level=1,
                  cues=['Stand tall, shoulders level, core braced.', 'Walk or march slowly and quietly.', 'Switch sides halfway when it is one-sided.']),
    'core': dict(cat='core', region='core', muscles=['core', 'obliques'], anim='russianTwist', back=1, level=2, floor=True,
                 cues=['Brace the core and keep breathing.', 'Move slowly and with control.', 'Stop before the lower back takes over.']),
    'arms': dict(cat='arms', region='upper', muscles=['triceps'], anim='triExt', back=0, level=1,
                 cues=['Keep the elbows still.', 'Move only at the elbow.', 'Control the bell on the way down.']),
    'hold': dict(cat='core', region='core', muscles=['shoulders', 'core'], anim='frontalHold', back=0, level=2,
                 cues=['Get into position and stay still.', 'Breathe steadily, ribs down.', 'Lower the bell as soon as the form slips.']),
    'pushup': dict(cat='push', region='upper', muscles=['chest', 'triceps', 'core'], anim='pushup', back=0, level=2, floor=True,
                   cues=['Hands on or by the bell, body in one straight line.', 'Lower the chest under control.', 'Press back up without sagging the hips.']),
    'flow': dict(cat='flow', region='total', muscles=['total body', 'cardio'], anim='cleanPress', back=2, level=3,
                 cues=['A fixed sequence of kettlebell moves linked without putting the bell down.', 'Learn each move on its own first.', 'Use a light bell and move smoothly.']),
    'juggling': dict(cat='juggling', region='total', muscles=['grip', 'coordination', 'shoulders'], anim='snatch', back=2, level=3,
                     cues=['Advanced: the bell leaves your hand and is caught again.', 'Only outdoors or on a forgiving floor, with space around you.', 'Learn with a light bell; never try to save a bad catch.']),
}

# (family, name, specs, overrides)
V = []
def add(fam, name, specs, **o): V.append((fam, name, specs, o))

# ---- Swing ----
add('swing', 'Conventional Swing', [S, SA, D1, D2], level=1)
add('swing', 'Squat Swing', [S, SA, D1, D2])
add('swing', 'American Swing', [D1], anim='swingAm', level=3)
add('swing', 'Atlas Swing', [S, D1])
add('swing', 'Pendulum Swing', [S, SA, D1])
add('swing', 'Short Lever Swing', [D1])
add('swing', 'Side-Step Swing', [D2])
add('swing', 'Suitcase Swing', [S, D2])
add('swing', 'Walking Swing', [S, D1, D2])
add('swing', 'Reverse Walking Swing', [S, D1, D2])
add('swing', 'Gorilla Swing', [S, D1, D2], level=3)
add('swing', 'Two-Phased Swing', [S, D1, D2])
add('swing', 'Two-Phased High-Pull Swing', [S, D1, D2], anim='highPull')
add('swing', 'Crescent Swing', [D1], level=3)
add('swing', 'Hardstyle Swing', [S, D1, D2])
add('swing', 'High Swing', [S, D1, D2])
add('swing', 'High Pull Swing', [S, D2], anim='highPull')
add('swing', 'Power Swing', [D1])
# ---- Clean ----
for n, sp, lv, an in [('Assisted Dead Clean', [S], 1, 'deadClean'), ('Assisted Hang Clean', [S], 1, 'clean'), ('Assisted Swing Clean', [S], 1, 'clean'),
                      ('Assisted Dead Swing Clean', [S], 1, 'clean'), ('Dead Clean', [S, SA, D2], 2, 'deadClean'), ('Hang Clean', [S, SA, D2], 2, 'clean'),
                      ('Gorilla Clean', [D2], 3, 'clean'), ('Gorilla Clean Open Palm', [D2], 3, 'clean'), ('Swing Clean', [S, SA, D1, D2], 2, 'clean'),
                      ('Swing Open Palm Clean', [S, SA, D2], 3, 'clean'), ('Swing Waiters Clean', [S, SA, D2], 3, 'clean'), ('Pendulum Clean', [S, SA, D2], 2, 'clean'),
                      ('Pendulum Open Palm Clean', [S, SA, D2], 3, 'clean'), ('Pendulum Waiters Clean', [S, SA, D2], 3, 'clean'), ('Pendulum Bottoms-Up Clean', [S, SA, D2], 3, 'clean'),
                      ('Dead Swing Clean', [S, SA, D2], 2, 'clean'), ('Dead Swing Open Palm Clean', [S, SA, D2], 3, 'clean'), ('Dead Swing Waiters Clean', [S, SA, D2], 3, 'clean'),
                      ('Dead Swing Bottoms-Up Clean', [S, SA, D2], 3, 'clean'), ('Bottoms-Up Clean', [S, D2], 3, 'clean'), ('Half Circular Clean', [S], 3, 'clean'),
                      ('Half Circular Dead Clean', [S], 3, 'deadClean'), ('Circular Clean', [S], 3, 'clean'), ('Goblet Clean', [D1], 1, 'deadClean'),
                      ('Horn Clean', [D1], 1, 'deadClean'), ('Open Hand Horn Clean', [D1], 2, 'deadClean'), ('Bottoms-Up Horn Clean', [D1], 2, 'deadClean'),
                      ('Suitcase Dead Clean', [S, D2], 2, 'deadClean'), ('Suitcase Hang Clean', [S, D2], 2, 'clean'), ('Pass-Through Side Clean', [S], 3, 'clean'),
                      ('Dead Split Clean', [S], 3, 'deadClean'), ('Hang Split Clean', [S], 3, 'clean'), ('Lawnmower Clean', [S, D1, D2], 2, 'deadClean'),
                      ('Switch Clean', [S], 3, 'clean'), ('Reverse Lunge Dead Clean', [S], 3, 'deadClean'), ('Forward Lunge Hang Clean', [S], 3, 'clean')]:
    add('clean', n, sp, level=lv, anim=an)
# ---- Squat ----
add('squat', 'Racked Front Squat', [S, D1, D2], anim='rackSquat')
add('squat', 'Deck Squat', [D1], level=3, floor=True)
add('squat', 'Bottoms-Up Squat', [S, D2], anim='rackSquat', level=3)
add('squat', 'Pistol Squat', [D1, D2], anim='cossack', level=3)
add('squat', 'Overhead Squat', [S, D2], anim='lungeOH', level=3, back=2)
add('squat', 'Fireman’s Squat', [S, D2])
add('squat', 'Waiter’s Squat', [S, D2], level=3)
add('squat', 'Noob Grip Squat', [S, D2], anim='rackSquat')
add('squat', 'Figure 8 Squat', [ALT], anim='fig8', back=2)
add('squat', 'Static Figure 8 Squat', [ALT], anim='fig8', back=2)
add('squat', 'Cossack Racked Squat', [S, D2], anim='cossack', level=3)
add('squat', 'Cossack Overhead Squat', [S], anim='cossack', level=3)
add('squat', 'Cossack Racked and Overhead Squat', [D2], anim='cossack', level=3)
add('squat', 'Thruster Squat', [S, D1, D2], anim='thruster', cat='total', region='total')
add('squat', 'Racked Bulgarian Split Squat', [S, D1, D2], anim='splitSquat', cat='lunge', note='Back foot on a chair or sofa.')
add('squat', 'Anyhow Squat', [D2], anim='rackSquat', level=3)
add('squat', 'Static Squat', [S, D1, D2], anim='squatHold')
add('squat', 'Racked Hindu Squat', [S, D1, D2], anim='squatPulse', level=3)
add('squat', 'Overhead Hindu Squat', [S, D1, D2], anim='squatPulse', level=3)
# ---- Press ----
add('press', 'Conventional Press', [S, D2])
add('press', 'Assisted Press', [S], level=1)
add('press', 'Strict Press', [S, D2])
add('press', 'Side Press', [S], anim='windmill', back=1, level=3)
add('press', 'Bent Side Press', [S], anim='windmill', back=2, level=3)
add('press', 'Push Press', [S, D2], anim='pushPress', back=1)
add('press', 'Sots Press', [S, D2, SA], anim='squatHold', back=1, level=3)
add('press', 'Bottoms-Up Press', [S, D2], anim='bottomsUp', level=3)
add('press', 'Seated Press', [S, D2], anim='chairPress', floor=True)
add('press', 'Chair Press', [S, D2], anim='chairPress')
add('press', 'Bridge Chest Press', [S, D2], anim='floorPress', floor=True)
add('press', 'Lunge Press', [S, D2], anim='halfKneelPress', back=1)
add('press', 'Floor Side Press', [S], anim='floorPress', floor=True)
add('press', 'Chest Press', [S, D1, D2], anim='floorPress', floor=True, muscles=['chest', 'triceps', 'shoulders'], level=1)
add('press', 'Chest Press Legs Raised', [S, D1, D2], anim='floorPress', floor=True, muscles=['chest', 'triceps', 'core'])
add('press', 'Floor Triceps Press', [S, D1, D2], anim='floorPress2', floor=True, muscles=['triceps', 'chest'])
add('press', 'Rotational Press', [S], back=1)
add('press', 'Seesaw Press', [D2])
add('press', 'Bent Press', [S, D2], anim='windmill', back=2, level=3)
add('press', 'Tabletop Press', [S], anim='floorPress', floor=True, level=3)
add('press', 'Goblet Press', [D1], anim='press2', level=1)
# ---- Curl ----
add('curl', 'Conventional Curl', [S, D1, D2])
add('curl', 'Hammer Curl', [S, D1, D2], anim='curl1')
add('curl', 'Squat Dead Curl', [S, D2], anim='squatLift', back=1, level=2)
add('curl', 'Gorilla Curl', [S, D2], anim='row', back=1, level=2)
add('curl', 'Side Curl', [S], anim='curl1')
add('curl', 'Znamensky Curl', [S, D1, D2], back=1, level=3)
# ---- Get-up ----
add('getup', 'Turkish Get-Up Lunge Style', [S])
add('getup', 'Turkish Get-Up Squat Style', [S])
add('getup', 'Half Get-Up', [S], level=2)
add('getup', 'Curtsy Get-Up', [S, D2])
add('getup', 'Racked Get-Up', [S])
add('getup', 'Ninety-Ninety Get-Up', [S, D2])
add('getup', 'Gladiator Get-Up', [S])
add('getup', 'Bottoms-Up Get-Up', [S])
add('getup', 'Roll Get-Up', [S])
# ---- Snatch ----
for n, sp in [('Half Snatch', [S, D2]), ('Full Snatch', [S, D2]), ('Open Palm Snatch', [S, D2]), ('Dead Half Snatch', [S, D2]), ('Dead Full Snatch', [S, D2]),
              ('Front Raise Snatch', [S, D2]), ('Side Raise Snatch', [S]), ('Waiter’s Snatch', [S, D2]), ('Lateral Snatch', [S])]:
    add('snatch', n, sp)
# ---- Jerk ----
for n, sp in [('Conventional Jerk', [S, D2]), ('Split Jerk', [S, D2]), ('Squat Jerk', [S, D2]), ('Long Cycle Clean and Jerk', [S, D2]), ('Anyhow Jerk', [D2])]:
    add('jerk', n, sp)
# ---- Windmill ----
add('windmill', 'Overhead Windmill', [S, D2])
add('windmill', '90/90 Windmill', [S], floor=True)
add('windmill', 'Low Windmill', [S])
# ---- Kneeling / surrender / up-downs / step-ups ----
add('kneeling', 'Racked Kneeling', [S, D1, D2])
add('kneeling', 'Racked Hip Extension Lunge', [S, D1, D2])
add('kneeling', 'Surrender', [S, D1, D2], level=3)
add('kneeling', 'Racked Up and Down', [S, D1, D2])
add('kneeling', 'Racked Step-Up', [S, D1, D2], anim='lungeKnee', floor=False, note='Needs a sturdy step or low box.')
# ---- Lunge ----
add('lunge', 'Racked Lunge', [S, D1, D2], anim='lungeRack')
add('lunge', 'Overhead Lunge', [S, D1, D2], anim='lungeOH', level=3)
add('lunge', 'Reverse Racked Lunge', [S, D1, D2], anim='lungeRack')
add('lunge', 'Reverse Overhead Lunge', [S, D1, D2], anim='lungeOH', level=3)
add('lunge', 'Figure 8 Lunge', [ALT], anim='passUnderLunge')
add('lunge', 'Figure O Lunge', [ALT], anim='passUnderLunge', level=3)
add('lunge', 'Lateral Lunge', [D1], anim='cossack')
add('lunge', 'Rotating Lunge', [D1])
add('lunge', 'Racked Curtsy Lunge', [S, D1, D2], anim='lungeRack')
add('lunge', 'Overhead Curtsy Lunge', [S, D1, D2], anim='lungeOH', level=3)
# ---- Lift (deadlift family) ----
add('lift', 'Racked Deadlift', [D2], level=2)
add('lift', 'Hang Squat Lift', [S, D1, D2], anim='squatLift')
add('lift', 'Hang Hip Hinge Lift', [S, D1, D2], anim='rdl', back=2)
add('lift', 'Dead Squat Lift', [S, SA, D1, D2], anim='squatLift')
add('lift', 'Dead Hip Hinge Lift', [S, SA, D1, D2])
add('lift', 'Dead Suitcase Lift', [S, SA, D2], anim='suitcaseDL')
add('lift', 'Dead Sumo Squat Lift', [S, SA, D1, D2], anim='squatLift')
add('lift', 'Dead Sumo Hip Hinge Lift', [S, SA, D1, D2])
add('lift', 'Dead Stiff-Legged Lift', [S, SA, D1, D2], anim='rdl', back=2)
add('lift', 'Single Stiff-Leg Lift', [S, D1, D2], anim='sldl', level=2)
add('lift', 'Single-Leg Hip Hinge Lift', [S, D1, D2], anim='sldl', level=2)
add('lift', 'Dead Burpee Lift', [D2], level=3, back=2, note='Includes a jump back – not apartment-quiet.')
add('lift', 'Dead to Overhead Deadlift', [D2], anim='cleanPress', level=3, back=2)
add('lift', 'Kettlebell Drag Hold', [S, D1, D2], anim='rdl', back=2, cat='hinge', note='Static hip-hinge hold.')
# ---- Row / high pull / armbar ----
add('row', 'Bent-Over Lunge Row', [S], anim='rowSup')
add('row', 'Bent-Over Dead Row', [S, D2], back=2)
add('row', 'Renegade Row', [S, D2], anim='plankRow', floor=True, muscles=['back', 'core', 'biceps'])
add('highpull', 'High Pull', [S, D1, D2])
add('core', 'Armbar', [S], anim='floorPress', back=0, muscles=['shoulders', 'core'], level=2)
# ---- Halo / carry / core ----
add('halo', 'Ribbons Halo', [D1], level=2)
add('halo', 'Oblique Orbit', [D1], level=2, muscles=['obliques', 'shoulders', 'core'])
add('carry', 'Racked Carry', [S, D2], anim='rackMarch')
add('carry', 'Goblet Carry', [D1], anim='gobletMarch', back=0)
add('carry', 'Overhead Carry', [S, D2], anim='ohMarch', level=2)
add('carry', 'Farmer’s Walk', [S, D2], anim='carry')
add('carry', 'Waiter’s Carry', [S], anim='ohMarch', level=2)
add('core', 'Russian Twist Figure 8', [D1], anim='russianTwist')
add('core', 'Spartan Side Plank', [S], anim='plank', level=3)
add('core', 'Spartan Sit', [S], anim='vsit', level=3)
add('core', 'Slingshot', [D1], anim='aroundWorld', floor=False, back=0, level=1)
add('core', 'Slingshot Lunge', [ALT], anim='passUnderLunge', floor=False, cat='lunge', region='lower')
add('core', 'Circular Swing', [D1], anim='aroundWorld', floor=False, back=1)
add('core', 'Sidewinder', [D1], anim='woodchop', floor=False, back=2)
add('core', 'Slasher', [D1], anim='woodchop', floor=False, back=2)
add('core', 'Woodchopper', [D1], anim='woodchop', floor=False, back=2)
add('core', 'Bootstrapper', [D1], anim='goblet', floor=False, cat='squat', region='lower', muscles=['quads', 'hamstrings', 'mobility'])
add('core', 'Starfish Reach', [D1], anim='deadbugPull', back=0)
add('core', 'Shrimp', [D1], anim='tgu', level=3)
add('core', 'V-Up', [D1], anim='vsit', level=3)
add('core', 'Side Bend', [D2], anim='sideBend', floor=False)
add('arms', 'Skullcrusher', [D1], anim='skull', floor=True)
add('arms', 'Overhead Triceps Extension', [D1, S], anim='triExt', back=1)
add('arms', 'Supine Twist Flye', [S, D1], anim='floorPress2', floor=True, cat='push', muscles=['chest', 'obliques'], level=2)
# ---- Isometrics ----
add('hold', 'Crucifix Hold', [D2], anim='lateralRaise', level=3)
add('hold', 'Y Side Hold', [D2], anim='lateralRaise')
add('hold', 'Salute Hold', [S, D2], anim='press')
add('hold', 'Bent Press Hold', [S], anim='windmill', back=2, level=3)
add('hold', 'Windmill Hold', [S], anim='windmill', back=2, level=3)
add('hold', 'Static Hip Hinge Hold', [D1], anim='rdl', back=2)
# ---- Good morning / push-ups ----
add('lift', 'Waiter’s Bow', [D1], anim='goodMorning', back=2, level=2)
add('pushup', 'Crush Grip Push-Up', [D1])
add('pushup', 'Archer Push-Up', [D1], level=3)
add('pushup', 'Bottoms-Up Push-Up', [S, D2], level=3)
# ---- Flows ----
for n in ['Lukova Flow', 'DaVinci Flow', 'Atlanta Flow', 'Uitermeer Flow', 'Sullivans Island Flow', 'Niewersluis Flow', 'Abcoude Flow', 'Fort Uitkijk Flow', 'Diemerdam Flow']:
    add('flow', n, [S])
# ---- Juggling ----
for n in ['Forward Flip', 'Backward Flip', 'Helicopter', 'Mug Spin', 'Oblique Flip', 'High Pull Flip', 'Bottoms-Up Flip', 'Snatch Flip', 'Punch Flip', 'Tap Flip', 'Uppercut Flip']:
    add('juggling', n, [S])

SPEC_NOTE = {S: 'One arm at a time – the time is split between both sides.', SA: 'Switch hands every rep.',
             D1: 'Both hands on one kettlebell.', D2: 'Needs two kettlebells, one in each hand.', ALT: 'Alternate sides every rep.'}

slug = lambda s: re.sub(r'[^a-z0-9]+', '', s.lower().replace('’', ''))
out, seen = [], set()
for fam, name, specs, o in V:
    base = dict(FAM[fam]); base.update(o)
    for sp in specs:
        full = name if len(specs) == 1 and sp in (D1, ALT) else f'{name} ({SUFFIX[sp]})'
        if name.endswith('Flow') or fam == 'juggling': full = name
        ident = 'cm_' + slug(full)
        if ident in seen: continue
        seen.add(ident)
        lvl = base['level'] + (1 if sp == D2 and base['level'] < 3 else 0)
        e = {'id': ident, 'name': full, 'cat': base['cat'], 'region': base['region'], 'muscles': base['muscles'], 'level': lvl, 'anim': base['anim'],
             'back': base['back'], 'lib': 1, 'family': fam}
        if sp == S and fam not in ('flow', 'juggling'): e['uni'] = True
        if sp in (SA, ALT): e['alt'] = True
        if sp == D2: e['eq'] = 2
        if base.get('floor'): e['floor'] = True
        cues = list(base['cues'])
        if fam not in ('flow', 'juggling'): cues.append(SPEC_NOTE[sp])
        if base.get('note'): cues.append(base['note'])
        e['cues'] = cues
        out.append(e)

js = ('// Generated by dev/build_library.py – full kettlebell exercise library\n'
      '// (based on the Caveman Kettlebells "list of all kettlebell exercises" and their variations).\n'
      '// Each entry: lib=1, back = lower-back load 0–2, eq=2 when two kettlebells are needed.\n'
      '(function () {\n  const LIB = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
      '  const have = new Set(EXERCISES.map((e) => e.name.toLowerCase()));\n'
      '  LIB.forEach((e) => { if (have.has(e.name.toLowerCase())) return; EXERCISES.push(e); EX[e.id] = e; });\n'
      '})();\n')
open('js/exercises-lib.js', 'w').write(js)
from collections import Counter
print(len(out), 'library exercises;', Counter(e['cat'] for e in out))
print('two-kettlebell:', sum(1 for e in out if e.get('eq') == 2), '| floor:', sum(1 for e in out if e.get('floor')), '| back-friendly (0-1):', sum(1 for e in out if e['back'] < 2))
