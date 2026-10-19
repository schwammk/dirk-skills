# Interview comparison format

Use this format before recommending an answer. Established language is a teaching aid, not a
requirement to adopt a pattern. Keep one unresolved question per round, then wait for the answer.
When the user explicitly requests a batch, include only questions with settled prerequisites.

## Choose the branch

- **Administrative:** No product behavior or structure remains open. Write one short reference
  line (“No named pattern needed — ticket naming is administrative”), the question, and the
  recommendation. End there.
- **Product policy:** State the confirmed behavior and the unresolved policy. Say that no named
  pattern chooses the policy. For state-changing policies, show what remains pending, what is
  accepted/stored, and when each alternative commits its effect. These are behavioral promises,
  not an implementation selection. Compare benefits and costs before proposing mechanics. Keep
  other open forces visible without asking their dependent questions yet.
- **Structural:** Use the full shape below. Classify the reference from the force index, explain
  its contract and limit, and compare credible mechanisms. A candidate is not a conformance claim.

## Required shape

1. **Forces / facts / open assumptions:** What must hold, what is verified, and what is still
   unknown. Find implementation facts yourself. The user's desired behavior is not a fact you
   can infer from existing code or tests.
2. **Reference:** Named-pattern candidate, partial analogy, principle/local idiom, or no named
   pattern needed, with a reason. For a named candidate or analogy, explain the problem it
   addresses, the required contract, and the missing or irrelevant guarantees; link the primary
   source. For a local idiom, explain the actual mechanism rather than inventing a catalog name.
   **If a named pattern is already proposed:** briefly explain its candidate role, contract, and
   limit with a primary-source link even when it cannot decide the current product policy. That
   explanation leaves adoption open; it does not turn every policy into a pattern discussion.
3. **Credible alternatives:** Each gets **mechanism → benefit → cost → useful when**, at comparable
   detail. Include the viable simpler option or status quo. A force already rejected by the user
   cannot become a credible option merely to fill the table. If only one option is viable, state
   why the strongest rejected candidate fails instead of inventing a choice.
4. **One question:** Ask the prerequisite policy or priority before dependent mechanics.
5. **Conditional recommendation:** State the priority that favors it and what would favor the
   strongest runner-up. An unknown priority stays explicit, even when the user usually agrees.

After the answer, record the chosen behavior and accepted cost. A corrected requirement replaces
the old premise and reopens its dependent branches. A preference question is not a pattern quiz.

## Worked example: presentation-state inputs

**Forces / facts / open assumptions:** The board needs content and session facts already exposed
by its collaborators. Direct reads remove pushed mappings but make real-collaborator tests more
stateful and asynchronous. We have not established whether production simplicity or isolated
tests matter more.

**Reference — named-pattern candidate:** [Presentation Model](https://martinfowler.com/eaaDev/PresentationModel.html)
puts presentation state and behavior outside concrete controls. It requires ownership of model/view
synchronization. Direct reads, a narrow readable port, and pushed updates can all support that
separation; the pattern does **not** select their collaborator seam.

| Alternative | Mechanism | Benefit | Cost | Useful when |
| --- | --- | --- | --- | --- |
| Direct reads | Board reads content/session collaborators | Less mapping and setter ordering | More collaborator coupling and stateful/async test setup | Production locality matters most |
| Readable port | Purpose-defined read contract with production and test adapters | Smaller test setup and explicit dependencies | Maintain a contract and check substitutes against production behavior | Isolation or varying sources justify that work |
| Keep pushes | View continues supplying facts | Lowest migration work and controllable inputs | Mapping and update ordering remain caller responsibilities | The current scale and near-term delivery cost favor it |

❓ **Q1 — Priority:** Which ongoing cost is most acceptable: heavier collaborator tests, a maintained
read contract, or retained mapping and setter ordering?

➡️ I lean toward direct reads **if production simplicity leads**. If isolated tests lead, the
readable port is the stronger choice. A working prototype establishes feasibility, not your priority.
