import random

from .models import Module, Question


def pick_questions_for_module(module: Module):
    selected = []
    for cfg in module.subject_configs.select_related("subject").all():
        pool = list(Question.objects.filter(subject=cfg.subject).order_by("id"))
        if module.randomize:
            random.shuffle(pool)
        selected.extend(pool[: cfg.question_count])

    if module.randomize:
        random.shuffle(selected)

    payload = []
    for q in selected:
        options = [q.option_a, q.option_b, q.option_c, q.option_d]
        indices = [0, 1, 2, 3]
        if module.randomize:
            random.shuffle(indices)
            
        shuffled_options = [options[i] for i in indices]
        new_correct_index = indices.index(q.correct_index)

        payload.append(
            {
                "id": q.id,
                "subjectId": q.subject_id,
                "text": q.text,
                "options": shuffled_options,
                "correct_index": new_correct_index,
            }
        )
    return payload
