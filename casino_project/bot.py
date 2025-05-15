from telebot import TeleBot, types
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

bot = TeleBot('7518211833:AAHr8QrFaVf7nm6IpMYackxmv7w0hbJmAiY')


# Главное меню
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    markup = InlineKeyboardMarkup(row_width=2)
    btn1 = InlineKeyboardButton("💰 Пополнение", callback_data='deposit')
    btn2 = InlineKeyboardButton("🆘 Помощь", callback_data='help')
    btn3 = InlineKeyboardButton("📜 Правила", callback_data='rules')
    btn4 = InlineKeyboardButton("🎮 Игры", callback_data='games')
    btn5 = InlineKeyboardButton("Переход на сайт 🔜", url='http://127.0.0.1:8000')  # Добавили callback_data
    markup.add(btn1, btn2, btn3, btn4, btn5)

    bot.send_message(
        message.chat.id,
        "🎲 <b>Добро пожаловать в LastDep Casino!</b> 🎲\n\n"
        "Выберите действие из меню ниже:",
        parse_mode='HTML',
        reply_markup=markup
    )


# Обработчики callback-запросов
@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    # Пополнение
    if call.data == 'deposit':
        handle_deposit(call)

    elif call.data == 'rules_accept':
        handle_agreement(call)

    elif call.data == 'deposit_ewallet':  # Обработка выбора электронных кошельков
        handle_ewallet(call)

    elif call.data == 'deposit_card':  # Обработка выбора банковской карты
        handle_card_deposit(call)

    # Помощь
    elif call.data == 'help':
        handle_help(call)

    # Правила
    elif call.data == 'rules':
        handle_rules(call)

    elif call.data == 'go_to_site':  # Обработка кнопки "Переход на сайт"
        bot.send_message(call.message.chat.id, "...")

    # Игры
    elif call.data == 'games':
        handle_games(call)

    # Дополнительные возможности
    elif call.data == 'wheel_of_fortune':
        handle_wheel_of_fortune(call)

    # Слоты
    elif call.data == 'slot_rules':
        handle_slot_rules(call)

    # Ставки
    elif call.data == 'more_games':
        handle_sport_bets(call)

    # Пример ставки
    elif call.data == 'bet_example':
        handle_bet_example(call)

    elif call.data == 'coin_game':  # Обработка нажатия на кнопку "Монетка"
        handle_coin_game(call)

    # Назад в меню
    elif call.data == 'back_to_menu':
        bot.delete_message(call.message.chat.id, call.message.message_id)
        send_welcome(call.message)


# Функция обработки пополнения
def handle_deposit(call):
    markup = InlineKeyboardMarkup()
    btn1 = InlineKeyboardButton("💳 Банковская карта", callback_data='deposit_card')
    btn2 = InlineKeyboardButton("📲 Электронные кошельки", callback_data='deposit_ewallet')  # Выбор электронных кошельков
    btn3 = InlineKeyboardButton("🔙 Назад", callback_data='back_to_menu')
    markup.add(btn1, btn2, btn3)

    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="💵 <b>ПОПОЛНЕНИЕ БАЛАНСА</b> 💵\n\n"
                 "Выберите способ пополнения:\n\n"
                 "• Минимальная сумма: 10$\n"
                 "• Мгновенное зачисление\n"
                 "• Без комиссии",
            parse_mode='HTML',
            reply_markup=markup
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "💵 <b>ПОПОЛНЕНИЕ БАЛАНСА</b> 💵\n\n"
            "Выберите способ пополнения:\n\n"
            "• Минимальная сумма: 10$\n"
            "• Мгновенное зачисление\n"
            "• Без комиссии",
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)

def handle_card_deposit(call):
    markup = InlineKeyboardMarkup()
    btn_back = InlineKeyboardButton("🔙 Назад", callback_data='deposit')  # Кнопка "Назад"
    markup.add(btn_back)

    try:
        # Отправка сообщения с тремя точками
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="💳 <b>БАНКОВСКАЯ КАРТА</b> 💳\n\n"
                 "Технические детали пополнения...\n\n"
                 "Подождите, пока мы обрабатываем ваш запрос...\n"
                 "...",  # Добавим три точки в конце
            parse_mode='HTML',
            reply_markup=markup
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "💳 <b>БАНКОВСКАЯ КАРТА</b> 💳\n\n"
            "Технические детали пополнения...\n\n"
            "Подождите, пока мы обрабатываем ваш запрос...\n"
            "...",  # Добавим три точки в конце
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)


def handle_ewallet(call):
    markup = InlineKeyboardMarkup()
    btn1 = InlineKeyboardButton("🏦 Сбер", callback_data='deposit_sber')
    btn2 = InlineKeyboardButton("💳 Тинькофф", callback_data='deposit_tinkoff')
    btn3 = InlineKeyboardButton("🔙 Назад", callback_data='deposit')  # Назад к выбору способа пополнения
    markup.add(btn1, btn2, btn3)

    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="📲 <b>ЭЛЕКТRONНЫЕ КОШЕЛЬКИ</b> 📲\n\n"
                 "Выберите сервис для пополнения:\n\n",
            parse_mode='HTML',
            reply_markup=markup
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "📲 <b>ЭЛЕКТRONНЫЕ КОШЕЛЬКИ</b> 📲\n\n"
            "Выберите сервис для пополнения:\n\n",
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)



# Функция обработки помощи
def handle_help(call):
    markup = InlineKeyboardMarkup()
    btn1 = InlineKeyboardButton("💬 Чат поддержки", url='http://127.0.0.1:8000')
    btn3 = InlineKeyboardButton("🔙 Назад", callback_data='back_to_menu')
    markup.add(btn1,btn3)

    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="🆘 <b>ЦЕНТР ПОМОЩИ</b> 🆘\n\n"
                 "• Ответы на частые вопросы\n"
                 "• Инструкции по играм\n"
                 "• Решение технических проблем\n\n",
            parse_mode='HTML',
            reply_markup=markup
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "🆘 <b>ЦЕНТР ПОМОЩИ</b> 🆘\n\n"
            "• Ответы на частые вопросы\n"
            "• Инструкции по играм\n"
            "• Решение технических проблем\n\n"
            "Наша поддержка работает 24/7",
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)


# Функция обработки правил
def handle_rules(call):
    markup = InlineKeyboardMarkup()
    btn1 = InlineKeyboardButton("✅ Я согласен", callback_data='rules_accept')
    btn2 = InlineKeyboardButton("🔙 Назад", callback_data='back_to_menu')
    markup.add(btn1, btn2)

    rules_text = (
        "📜 <b>ОФИЦИАЛЬНЫЕ ПРАВИЛА</b> 📜\n\n"
        "<b>1. Минимальный возраст:</b> 18+\n"
        "• Все игроки должны быть не моложе 18 лет для участия в азартных играх.\n\n"
        "<b>2. Запрещены мультиаккаунты:</b>\n"
        "• Каждый игрок может иметь только один аккаунт. Нарушение этого правила приведет к блокировке всех связанных аккаунтов.\n\n"
        "<b>3. Результаты определяются RNG:</b>\n"
        "• Все игры используют генератор случайных чисел (RNG) для обеспечения честности результатов. Убедитесь, что вы ознакомлены с принципами работы RNG.\n\n"
        "<b>4. Проверка операций:</b>\n"
        "• Администрация оставляет за собой право проверять операции для предотвращения мошенничества и защиты интересов честных игроков.\n\n"
        "<b>5. Ограничения на ставки:</b>\n"
        "• Установлены максимальные и минимальные лимиты ставок для каждой игры. Ознакомьтесь с ними перед началом игры.\n\n"
        "<b>6. Ответственная игра:</b>\n"
        "• Мы рекомендуем игрокам установить лимиты на ставки и избегать игры в состоянии алкогольного опьянения. Игры должны быть развлечением, а не способом заработка.\n\n"
        "<b>7. Конфиденциальность:</b>\n"
        "• Вся информация о пользователях хранится в безопасности. Мы не передаем ваши данные третьим лицам без вашего согласия.\n\n"
        "<b>8. Бонусы и акции:</b>\n"
        "• Все бонусы и акции имеют свои условия. Пожалуйста, ознакомьтесь с ними перед использованием. Правила могут меняться.\n\n"
        "<b>9. Запрещение азартных игр несовершеннолетними:</b>\n"
        "• Мы строго запрещаем людям младше 18 лет участвовать в азартных играх. Мы будем использовать доступные средства для проверки возраста пользователей.\n\n"
        "<b>10. Изменение правил:</b>\n"
        "• Компания оставляет за собой право изменять любые правила без предварительного уведомления. Пожалуйста, регулярно проверяйте наличие обновлений."
    )

    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text=rules_text,
            parse_mode='HTML',
            reply_markup=markup
        )
    except Exception as e:
        # Вывод ошибки в консоль, если это нужно для отладки
        print(e)
        bot.send_message(
            call.message.chat.id,
            rules_text,
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)

def handle_agreement(call):
    agreement_text = (
        "✅ <b>СОГЛАШЕНИЕ С УСЛОВИЯМИ</b> ✅\n\n"
        "Вы подтвердили, что ознакомлены с официальными правилами казино и согласны с ними.\n\n"
        "• Полная ответственность за свои действия в игре лежит на вас. Играя на нашем сайте, вы берете на себя риск и ответственность за все финансовые решения.\n"
        "• Казино не несет ответственности за убытки, которые могут возникнуть в результате участия в азартных играх.\n"
        "• Мы настоятельно рекомендуем играть ответственно. Если вы чувствуете, что азартные игры начинают негативно влиять на вашу жизнь, пожалуйста, обратитесь за помощью.\n\n"
        "Спасибо за ваше доверие и понимание!"
    )

    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text=agreement_text,
            parse_mode='HTML'
        )
    except Exception as e:
        # Вывод ошибки в консоль, если это нужно для отладки
        print(e)
        bot.send_message(
            call.message.chat.id,
            agreement_text,
            parse_mode='HTML'
        )
    finally:
        bot.answer_callback_query(call.id)




# Функция обработки игр
def handle_games(call):
    markup = InlineKeyboardMarkup(row_width=2)
    btn1 = InlineKeyboardButton("🪙 Монетка", callback_data='coin_game')
    btn2 = InlineKeyboardButton("🎰 Слоты", callback_data='slot_rules')
    btn3 = InlineKeyboardButton("⚽️ Ставки", callback_data='more_games')
    btn4 = InlineKeyboardButton("📦 Кейсы", callback_data='cases')
    btn5 = InlineKeyboardButton("🎡 Колесо Фортуны", callback_data='wheel_of_fortune')  # Измененная кнопка
    btn6 = InlineKeyboardButton("🔙 Назад", callback_data='back_to_menu')
    markup.add(btn1, btn2, btn3, btn4, btn5, btn6)

    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="🎮 <b>ВЫБЕРИТЕ ИГРУ</b> 🎮\n\n"
                 "• Классические азартные игры\n"
                 "• Спортивные ставки\n"
                 "• Эксклюзивные режимы",
            parse_mode='HTML',
            reply_markup=markup
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "🎮 <b>ВЫБЕРИТЕ ИГРУ</b> 🎮\n\n"
            "• Классические азартные игры\n"
            "• Спортивные ставки\n"
            "• Эксклюзивные режимы",
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)


# Функция обработки игры "Монетка"
def handle_coin_game(call):
    markup = InlineKeyboardMarkup(row_width=1)
    btn1 = InlineKeyboardButton("🔙 Назад", callback_data='games')
    markup.add(btn1)

    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="🪙 <b>ИГРА: МОНЕТКА</b> 🪙\n\n"
                 "• Простая игра на удачу, где вам нужно угадать, какая сторона монеты выпадет!\n"
                 "• Сделайте ставку и выберите сторону: орел или решка.\n"
                 "• Выигрываете, если угадали!",  # Описание игры
            parse_mode='HTML',
            reply_markup=markup
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "🪙 <b>ИГРА: МОНЕТКА</b> 🪙\n\n"
            "• Простая игра на удачу, где вам нужно угадать, какая сторона монеты выпадет!\n"
            "• Сделайте ставку и выберите сторону: орел или решка.\n"
            "• Выигрываете, если угадали!",  # Описание игры
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)

# Функция обработки колеса фортуны
def handle_wheel_of_fortune(call):
    markup = InlineKeyboardMarkup(row_width=1)
    btn1 = InlineKeyboardButton("🔙 Назад", callback_data='games')
    markup.add(btn1)

    # Текстовое описание колеса фортуны
    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="🎡 <b>КОЛЕСО ФОРТУНЫ</b> 🎡\n\n"
                 "• Классическая игра на удачу, где каждый может выиграть призы!\n"
                 "• Крутите колесо и смотрите, какое вознаграждение вам достанется.\n"
                 "• Не упустите возможность испытать удачу!",
            parse_mode='HTML',
            reply_markup=markup
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "🎡 <b>КОЛЕСО ФОРТУНЫ</b> 🎡\n\n"
            "• Классическая игра на удачу, где каждый может выиграть призы!\n"
            "• Крутите колесо и смотрите, какое вознаграждение вам достанется.\n"
            "• Не упустите возможность испытать удачу!",
            parse_mode='HTML',
            reply_markup=markup
        )
    finally:
        bot.answer_callback_query(call.id)




# Функция обработки слотов
def handle_slot_rules(call):
    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="🎰 <b>ИГРА 'СЛОТЫ'</b> 🎰\n\n"
                 "🎯 <b>Цель:</b> собери 3 одинаковых символа!\n\n"
                 "💰 <b>Выигрышные комбинации:</b>\n"
                 "▪️ 3 звёзды ★★★ = ДЖЕКПОТ ×100\n\n"
                 "⚡️ <b>Особенности:</b>\n"
                 "- Минимальная ставка: 10 монет\n"
                 "- Режим автоматического вращения\n\n"
                 "<i>Крути барабаны и забирай призы! лудик</i> 🚀",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Назад", callback_data='games')]
            ])
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "🎰 <b>ИГРА 'СЛОТЫ'</b> 🎰\n\n"
            "🎯 <b>Цель:</b> собери 3 одинаковых символа!\n\n"
            "💰 <b>Выигрышные комбинации:</b>\n"
            "▪️ 3 звёзды ★★★ = ДЖЕКПОТ ×100\n\n"
            "⚡️ <b>Особенности:</b>\n"
            "- Минимальная ставка: 10 монет\n"
            "- 5 разных тематических слотов\n"
            "- Режим автоматического вращения\n\n"
            "<i>Крути барабаны и забирай призы! лудик</i> 🚀",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Назад", callback_data='games')]
            ])
        )
    finally:
        bot.answer_callback_query(call.id)
# Функция обработки спортивных ставок
def handle_sport_bets(call):
    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="⚽️ <b>СТАВКИ НА СПОРТ</b> ⚽️\n\n"
                 "🎯 <b>Доступные события:</b>\n"
                 "• Футбол: Лига Чемпионов, Премьер-лига\n"
                 "• Киберспорт: CS:GO, Dota 2, Valorant\n"
                 "• Теннис, баскетбол, хоккей\n\n"
                 "💰 <b>Как играть:</b>\n"
                 "1. Выберите матч и исход\n"
                 "2. Укажите сумму (от 10 монет)\n"
                 "3. Подтвердите ставку\n\n"
                 "✨ <b>Преимущества:</b>\n"
                 "- Коэффициенты до 50.0\n"
                 "- LIVE-ставки в реальном времени\n"
                 "- Мгновенные выплаты\n"
                 "- Бонусы для новых игроков",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Назад", callback_data='games')],
                [InlineKeyboardButton("📊 Пример ставки", callback_data='bet_example')]
            ])
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "⚽️ <b>СТАВКИ НА СПОРТ</b> ⚽️\n\n"
            "🎯 <b>Доступные события:</b>\n"
            "• Футбол: Лига Чемпионов, Премьер-лига\n"
            "• Киберспорт: CS:GO, Dota 2, Valorant\n"
            "• Теннис, баскетбол, хоккей\n\n"
            "💰 <b>Как играть:</b>\n"
            "1. Выберите матч и исход\n"
            "2. Укажите сумму (от 10 монет)\n"
            "3. Подтвердите ставку\n\n"
            "✨ <b>Преимущества:</b>\n"
            "- Коэффициенты до 50.0\n"
            "- LIVE-ставки в реальном времени\n"
            "- Мгновенные выплаты\n"
            "- Бонусы для новых игроков",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Назад", callback_data='games')],
                [InlineKeyboardButton("📊 Пример ставки", callback_data='bet_example')]
            ])
        )
    finally:
        bot.answer_callback_query(call.id)

# Функция обработки примера ставки
def handle_bet_example(call):
    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text="📊 <b>ПРИМЕР СТАВКИ</b> 📊\n\n"
                 "⚽️ <u>Матч:</u> Барселона vs Реал Мадрид\n"
                 "🕒 <u>Дата:</u> 26.04.2025 20:00\n\n"
                 "▪️ П1 (победа Барсы): 2.50\n"
                 "▪️ Х (ничья): 3.20\n"
                 "▪️ П2 (победа Реала): 2.80\n\n"
                 "<i>Ставка 100 монет на П1 принесет 250 монет</i>",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Назад", callback_data='more_games')]
            ])
        )
    except:
        bot.send_message(
            call.message.chat.id,
            "📊 <b>ПРИМЕР СТАВКИ</b> 📊\n\n"
            "⚽️ <u>Матч:</u> Барселона vs Реал Мадрид\n"
            "🕒 <u>Дата:</u> 26.04.2025 20:00\n\n"
            "▪️ П1 (победа Барсы): 2.50\n"
            "▪️ Х (ничья): 3.20\n"
            "▪️ П2 (победа Реала): 2.80\n\n"
            "<i>Ставка 100 монет на П1 принесет 250 монет</i>",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Назад", callback_data='more_games')]
            ])
        )
    finally:
        bot.answer_callback_query(call.id)

if __name__ == '__main__':
    bot.polling(none_stop=True)
