import json
import os
from openai import OpenAI


# ── Sport-specific coaching context ──────────────────────────────────────────
# Each entry shapes the AI coach persona, biomechanical focus areas, common
# injury risks, and the style of cues used in feedback.

SPORT_CONTEXT = {
    "Snowboarding": {
        "coach": "professional snowboard coach and movement specialist",
        "focus": (
            "edge transitions, knee flex, hip alignment, arm position for balance, "
            "carve mechanics, ollie/nollie pop timing, and landing absorption"
        ),
        "risks": (
            "ACL and MCL tears, wrist fractures on falls, shoulder impact injuries, "
            "and knee hyperextension on hard landings"
        ),
        "cues": (
            "Think about pressing toes or heels into the snow, keeping knees soft "
            "and absorbing landings through the legs, and using arm position to "
            "counterbalance rotation."
        ),
    },
    "Skateboarding": {
        "coach": "professional skateboarding coach and movement specialist",
        "focus": (
            "pop timing and snap, weight distribution over the board, catching the "
            "board at the peak of the trick, landing stance width, knee absorption "
            "on impact, and ankle stability"
        ),
        "risks": (
            "ankle sprains and fractures, wrist fractures from falls, knee contusions, "
            "and hip/tailbone impact injuries"
        ),
        "cues": (
            "Focus on staying centered over the board, leveling out at the peak of the "
            "trick, and bending your knees deep on every landing to spread the impact."
        ),
    },
    "BMX": {
        "coach": "professional BMX coach and movement specialist",
        "focus": (
            "body position over the bike, compression timing before lips and jumps, "
            "manual balance point, elbow height and width, lower body drive and "
            "leg grip on the frame"
        ),
        "risks": (
            "handlebar impact injuries, collarbone fractures, wrist and forearm injuries, "
            "and knee overuse from pedaling mechanics"
        ),
        "cues": (
            "Think about loading the bike hard before every transition, keeping elbows "
            "up and out for control, and using your hips — not just your arms — to "
            "steer and balance in the air."
        ),
    },
    "Skiing": {
        "coach": "professional alpine and freestyle ski coach",
        "focus": (
            "hip-width athletic stance, angulation through turns, edge transitions, "
            "pole timing and planting, mogul absorption through the knees and hips, "
            "and forward lean over the boots"
        ),
        "risks": (
            "ACL tears (especially on twisting falls), knee MCL injuries, "
            "shoulder dislocations, and skier's thumb"
        ),
        "cues": (
            "Focus on keeping your hands forward and visible, driving your knees "
            "into the hill, and staying stacked over the balls of your feet — not "
            "leaning back."
        ),
    },
    "Parkour": {
        "coach": "professional parkour and freerunning coach",
        "focus": (
            "landing mechanics and roll technique, precision foot placement, "
            "take-off timing and angle, full-body tension through vaults, "
            "and wrist/shoulder loading during hand placements"
        ),
        "risks": (
            "ankle fractures and sprains from bad landings, wrist injuries from "
            "hard hand placements, knee hyperextension, and shin impact injuries"
        ),
        "cues": (
            "Think about landing toe-to-heel with knees bent to absorb impact, "
            "keeping your core braced through every obstacle, and always scanning "
            "the next landing before you leave the current one."
        ),
    },
    "Surfing": {
        "coach": "professional surf coach and movement specialist",
        "focus": (
            "stance width and foot positioning, hip rotation through turns, "
            "center of gravity height, pop-up mechanics and timing, arm positioning "
            "for balance and drive, and weight distribution fore-to-aft"
        ),
        "risks": (
            "shoulder rotator cuff injuries from paddling, knee twists from rail "
            "turns, lower back strain from pop-ups, and head and neck injuries "
            "from wipeouts in shallow water"
        ),
        "cues": (
            "Focus on a low center of gravity, driving your rear hip through turns, "
            "keeping your front shoulder open to the wave, and popping up in one "
            "explosive movement — not two."
        ),
    },
    "Motocross": {
        "coach": "professional motocross coach and movement specialist",
        "focus": (
            "body position on the bike, attack stance vs seated position, "
            "weight shift forward and back over jumps, elbow height, "
            "leg grip on the frame, and roost/impact absorption"
        ),
        "risks": (
            "collarbone fractures, wrist and arm injuries from impacts, "
            "knee ligament damage from foot-peg catches, and lower back "
            "compression injuries"
        ),
        "cues": (
            "Think about standing in attack position through rough terrain, "
            "keeping elbows high and wide, and squeezing the bike with your "
            "legs to absorb the bike's movement rather than taking it through "
            "your arms and shoulders."
        ),
    },
    "Rock Climbing": {
        "coach": "professional rock climbing and movement coach",
        "focus": (
            "footwork precision and trust, hip-to-wall distance, reach efficiency "
            "and body positioning before each move, overgripping tension in hands "
            "and forearms, and core engagement throughout"
        ),
        "risks": (
            "finger pulley injuries from crimping and dynamic moves, shoulder "
            "impingement, elbow tendinitis, and ankle injuries from unexpected "
            "falls or bad foot placements"
        ),
        "cues": (
            "Focus on trusting your feet completely, keeping your hips as close "
            "to the wall as possible on steep terrain, and staying three moves "
            "ahead to minimize wasted energy and tension."
        ),
    },
    "Wingsuiting": {
        "coach": "professional wingsuit BASE jumping and skydiving coach",
        "focus": (
            "pre-exit body position and stability, head angle relative to glide "
            "path, arm and leg spread symmetry for consistent glide ratio, "
            "body tension and stiffness in flight, and approach posture "
            "before canopy deployment"
        ),
        "risks": (
            "deployment instability from asymmetric body position, terrain impact "
            "from uncorrected glide deviation, and exit instability leading to "
            "uncontrolled rotation"
        ),
        "cues": (
            "Symmetry is everything — equal pressure in both arms and legs, "
            "neutral head position without looking down, and a relaxed but "
            "tensioned core to maintain a consistent and predictable glide angle."
        ),
    },
    "Other": {
        "coach": "professional strength and conditioning coach and movement specialist",
        "focus": (
            "joint alignment and stacking, movement symmetry between left and right, "
            "impact absorption and deceleration mechanics, explosive power generation, "
            "and injury risk patterns from repetitive loading"
        ),
        "risks": (
            "overuse injuries from asymmetric loading, joint hyperextension, "
            "impact-related trauma from poor landing mechanics, and muscle imbalances "
            "leading to compensation patterns"
        ),
        "cues": (
            "Focus on neutral joint alignment, equal loading between both sides of "
            "the body, and controlling deceleration as carefully as you control "
            "acceleration."
        ),
    },
}


def generate_coaching_feedback(profile: dict, metrics: dict) -> dict:
    """
    Takes athlete profile and biomechanical metrics from MediaPipe,
    returns structured coaching feedback as a dict.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")

    client = OpenAI(api_key=api_key)

    sport = profile.get("sport", "Other")
    ctx = SPORT_CONTEXT.get(sport, SPORT_CONTEXT["Other"])

    system_prompt = f"""You are a {ctx['coach']} who explains biomechanics in clear, practical language.

You are analyzing a {sport} athlete. Your feedback must be grounded in {sport}-specific mechanics.

SPORT-SPECIFIC FOCUS AREAS:
{ctx['focus']}

COMMON INJURY RISKS IN {sport.upper()}:
{ctx['risks']}

COACHING CUE STYLE FOR {sport.upper()}:
{ctx['cues']}

STYLE REQUIREMENTS:
- Professional, supportive, and direct
- Natural human coaching tone — not academic or robotic
- Explain problems in simple language the athlete will immediately understand
- Translate metrics into real-world meaning (do NOT lead with raw numbers)
- Only mention numbers if they clarify a specific risk or improvement target
- Focus on what the athlete should FEEL or DO differently
- Use sport-specific language and reference the athlete's actual sport throughout
- Give clear, practical coaching cues rooted in {sport} technique
- Prioritize injury prevention and performance in that order

DO NOT:
- Write like a research paper or medical report
- Overuse biomechanical terminology without explanation
- Give generic athletic advice that could apply to any sport
- List raw metrics without translating them to what they mean in {sport}

FRAME FEEDBACK LIKE A REAL {sport.upper()} COACH:
- Start with an honest overall performance assessment
- Explain the main technique issues and why they matter for {sport}
- Give specific form corrections with actionable cues
- Provide practical drills the athlete can do at their next session
- Include relevant safety guidance for {sport}
- End with a structured conditioning focus

Also factor in the athlete's body metrics (height, weight, age), skill level,
training frequency, and injury history when calibrating your feedback.
Don't shy away from referencing these if they're relevant to safety or performance.

Return ONLY valid JSON in the exact structure requested.
"""

    user_payload = {
        "athlete_profile": profile,
        "biomechanical_metrics": metrics,
        "required_output_structure": {
            "overall_assessment": (
                "Short coach-style summary of performance, main issues, and top priorities. "
                f"Speak directly to the athlete. Reference their {sport} specifically."
            ),
            "form_corrections": [
                f"Clear {sport} coaching cue — what to change and what it should feel like",
                f"Clear {sport} coaching cue — what to change and what it should feel like",
                f"Clear {sport} coaching cue — what to change and what it should feel like",
            ],
            "safety_warnings": [
                "Simple explanation of the risk and what to avoid or watch for",
                "Simple explanation of the risk and what to avoid or watch for",
            ],
            "drills": [
                f"Practical {sport} drill with how to do it and what to focus on",
                f"Practical {sport} drill with how to do it and what to focus on",
            ],
            "conditioning": (
                "Structured training plan focused on strength, control, and injury prevention. "
                f"Tailor it to {sport} demands. Format as a short bulleted list."
            ),
        },
    }

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, indent=2)},
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON from model", "raw_response": content}
