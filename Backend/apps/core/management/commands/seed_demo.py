from django.core.management.base import BaseCommand

from apps.accounts.models import User, UserRole
from apps.core.models import Group, Module, ModuleSubjectConfig, Question, Subject


class Command(BaseCommand):
    help = "Seed initial demo data like current frontend store"

    def handle(self, *args, **options):
        if User.objects.filter(username="admin").exists():
            self.stdout.write(self.style.WARNING("Seed already exists, skipping."))
            return

        group = Group.objects.create(name="Tasviriy San'at - 2024-01", is_archived=False)
        subj = Subject.objects.create(name="Tasviriy San'at Nazariyasi", is_demo=False)
        demo_subj = Subject.objects.create(name="Demo: Tasviriy San'at Nazariyasi", is_demo=True)

        module = Module.objects.create(
            name="Rangtasvir va Kompozitsiya",
            is_demo=False,
            points_per_answer=5,
            duration_minutes=10,
            passing_score=15,
            randomize=True,
            is_active=True,
        )
        module.groups.add(group)
        ModuleSubjectConfig.objects.create(module=module, subject=subj, question_count=5)

        demo_module = Module.objects.create(
            name="Demo: Ranglar asoslari",
            is_demo=True,
            points_per_answer=5,
            duration_minutes=8,
            passing_score=10,
            randomize=True,
            is_active=True,
        )
        demo_module.groups.add(group)
        ModuleSubjectConfig.objects.create(module=demo_module, subject=demo_subj, question_count=3)

        Question.objects.bulk_create(
            [
                Question(subject=subj, text="Guanash bo'yog'i qanday asosga ega?", option_a="Suv", option_b="Moy", option_c="Sirt", option_d="Lola", correct_index=0),
                Question(subject=subj, text="Kompozitsiya qonuniyatlariga nima kirmaydi?", option_a="Yaxlitlik", option_b="Mantiqsizlik", option_c="Kontrast", option_d="Muvozanat", correct_index=1),
                Question(subject=subj, text="Asosiy ranglar necha xil?", option_a="2 ta", option_b="3 ta", option_c="5 ta", option_d="7 ta", correct_index=1),
                Question(subject=subj, text="Akvarel texnikasida eng muhim vosita nima?", option_a="Loyiha", option_b="Qalam", option_c="Suv", option_d="Yog'", correct_index=2),
                Question(subject=subj, text="Portret janri nimani tasvirlaydi?", option_a="Tabiatni", option_b="Hayvonlarni", option_c="Insonni", option_d="Binolarni", correct_index=2),
                Question(subject=demo_subj, text="Sariq va ko'k aralashsa qaysi rang hosil bo'ladi?", option_a="Yashil", option_b="Qizil", option_c="Binafsha", option_d="Qora", correct_index=0),
                Question(subject=demo_subj, text="Kontrast nimani anglatadi?", option_a="Bir xil ranglar", option_b="Farqli elementlar kuchi", option_c="Faqat qora rang", option_d="Faqat oq rang", correct_index=1),
                Question(subject=demo_subj, text="Kompozitsiyada muvozanat nima?", option_a="Tasodifiy joylashuv", option_b="Elementlar uyg'unligi", option_c="Faqat markaz", option_d="Rangsizlik", correct_index=1),
            ]
        )

        admin = User.objects.create_superuser(username="admin", password="123", email="admin@example.com")
        admin.full_name = "Admin User"
        admin.role = UserRole.ADMIN
        admin.workplace = "Markaz"
        admin.save()

        User.objects.create_user(
            username="manager",
            password="123",
            full_name="Menejer Bekzod",
            role=UserRole.MANAGER,
            workplace="Markaz",
        )
        User.objects.create_user(
            username="tinglovchi",
            password="123",
            full_name="Ali Valiyev",
            role=UserRole.PARTICIPANT,
            workplace="Maktab 1",
            group=group,
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
