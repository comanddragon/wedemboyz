# Dashboard design system

## Direction

The admin and customer workspaces use a **laundry operations atelier** direction: a generous white working surface on a quiet gray canvas, compact horizontal navigation, dense but calm information layouts, and one warm gold signal color drawn from the Wedemboyz Lavomatique flyer.

## Color roles

- `navy` (`#071130`): primary text, active navigation, and high-emphasis panels.
- `gold` (`#DFA013`): primary actions, attention, and branded emphasis.
- White (`#FFFFFF`): every dashboard surface and card.
- Canvas gray (`#AEB3BD`): outer desktop frame only.
- Green and red: semantic success and error states only.
- Supporting service colors remain available on public marketing and service-selection surfaces, but are not mixed into dashboard structure.

## Layout rules

- Dashboard routes use their own shell and never inherit the public website header or decorative bubbles.
- On large screens, the workspace is framed by a 28px-radius white shell with a maximum width of 1680px.
- Navigation is horizontal and pill-based. Admin destinations remain filtered by RBAC permissions.
- Mobile navigation becomes a right-side sheet with the same route set and permission behavior.
- Overview metrics form one divided information strip rather than a grid of competing cards.
- Content cards use true white, a quiet neutral border, 22px corner radius, and little or no shadow.

## Typography and density

- Space Grotesk is used for large headings and tabular emphasis; the system sans stack is used for interface text.
- Page titles are 30–36px with tight tracking. Supporting text stays compact and neutral.
- Tables and operational lists prioritize scan speed, restrained separators, and status badges over decoration.

## Interaction

- Active navigation is navy with white text.
- Gold is reserved for principal actions and branded emphasis.
- Hover and focus states change both tone and boundary; keyboard focus must remain visible.
- Motion should be brief and functional, and respect reduced-motion preferences.
