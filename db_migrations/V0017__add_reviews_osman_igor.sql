-- Игорь (бригадир) — новый номер
INSERT INTO phone_numbers (phone) VALUES ('+7 910 351-68-69')
ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone;

-- Отзыв на Османа (существующий номер id=8)
INSERT INTO reviews (phone_id, rating, verdict, author, customer_name, object_address, comment, tags)
SELECT id, 1, 'scam', 'Аноним', 'Осман', '',
  'Представляется Османом, не платит деньги за рабочих. Отработали 6 человек — не заплатили, спустя две недели снова просит людей. Звонит, клоун.',
  'не платит, обман'
FROM phone_numbers WHERE phone = '+7 903 571-57-87';

-- Отзыв на Игоря (бригадир)
INSERT INTO reviews (phone_id, rating, verdict, author, customer_name, object_address, comment, tags)
SELECT id, 1, 'scam', 'Аноним', 'Бригадир Игорь', '',
  'Бригадир Игорь — работает в связке с Османом. Не платят за рабочих, будут искать людей. Отработали 6 человек, не заплатили спустя две недели и снова просит людей.',
  'не платит, обман'
FROM phone_numbers WHERE phone = '+7 910 351-68-69';