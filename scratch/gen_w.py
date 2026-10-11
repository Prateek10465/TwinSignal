w = [
    '##...##',
    '##...##',
    '##.#.##',
    '##.#.##',
    '.##.##.',
]
rects = []
# Group into larger rectangles for smaller SVG footprint
# Left ear/stem:
# x=0, y=0..3: width 2, height 4 (rect x=0 y=0 width=2 height=4)
# Right ear/stem:
# x=5, y=0..3: width 2, height 4 (rect x=5 y=0 width=2 height=4)
# Center stem:
# x=3, y=2..3: width 1, height 2 (rect x=3 y=2 width=1 height=2)
# Bottom row (y=4):
# x=1..2: width 2, height 1 (rect x=1 y=4 width=2 height=1)
# x=4..5: width 2, height 1 (rect x=4 y=4 width=2 height=1)
print('''<svg viewBox="0 0 7 5" width="0.77em" height="0.625em" style="display:inline-block; vertical-align: -0.01em; fill: currentColor; overflow: visible" aria-label="W" role="img" shape-rendering="crispEdges">
  <rect x="0" y="0" width="2" height="4"/>
  <rect x="5" y="0" width="2" height="4"/>
  <rect x="3" y="2" width="1" height="2"/>
  <rect x="1" y="4" width="2" height="1"/>
  <rect x="4" y="4" width="2" height="1"/>
</svg>''')
