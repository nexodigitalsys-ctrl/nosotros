-- =====================================================================
--  NÓS / NOSOTROS — semilla días 8-30 (semanas 2, 3 y 4)
--  Ejecutar en el SQL Editor de Supabase DESPUÉS de nos-schema.sql.
--  Re-ejecutable: usa ON CONFLICT, así puedes editar y volver a correr.
--
--  Semana 2 «Reconocer»  → mapas del amor (Gottman) + autorrevelación
--                          creciente (Aron). Curiosidad por el otro.
--  Semana 3 «El ciclo»   → EFT (Sue Johnson): nombrar el patrón
--                          perseguir-retirarse, emoción primaria vs
--                          secundaria, necesidades de apego, reparar.
--  Semana 4 «Construir»  → futuro, acuerdos, rituales, reelección.
-- =====================================================================

insert into public.program_days (day_number, week_number, theme_key, question_es, gesture_es) values

-- ---- Semana 2 · Reconocer (8-14) ----------------------------------
 (8, 2,'mapa',        '¿Qué es lo que más le preocupa o le ilusiona a mi pareja en este momento de su vida?', 'Preguntarle por algo de su día que normalmente no pregunto, y solo escuchar.'),
 (9, 2,'suenos',      'Si pudiéramos cambiar una cosa de nuestra vida juntos en el próximo año, ¿qué pediría yo?', 'Contarle un deseo mío que casi nunca digo en voz alta.'),
 (10,2,'historia',    '¿Cuál es un recuerdo nuestro que me hace sonreír y hace mucho no menciono?', 'Buscar juntos una foto antigua y contar qué sentíamos ese día.'),
 (11,2,'curiosidad',  '¿Qué descubrí de ti estos días que creía saber y en realidad no sabía?', 'Hacerle tres preguntas sobre su mundo interior y no opinar, solo escuchar.'),
 (12,2,'vulnerable',  '¿De qué tengo un poco de miedo en nuestra relación y casi nunca lo digo?', 'Compartir esa cosa, sin pedir que la arreglen, solo para que la conozca.'),
 (13,2,'apoyo',       '¿Cuándo me he sentido más sostenido por ti, y se lo he reconocido?', 'Agradecerle por haber estado en un momento concreto en que lo estuvo.'),
 (14,2,'cierre2',     '¿Qué reconocí de ti esta semana que cambió un poco cómo te miro?', 'Un rato sin pantallas para contarnos cómo nos sentimos hoy con el reto.'),

-- ---- Semana 3 · El ciclo (15-21) ----------------------------------
 (15,3,'ciclo',       'Cuando nos distanciamos, ¿qué suelo hacer yo: perseguir o retirarme?', 'Nombrar juntos nuestro patrón, sin culpa: cuando pasa algo, uno insiste y el otro se cierra.'),
 (16,3,'disparador',  '¿Qué pequeña cosa me dispara y me hace cerrarme o reaccionar mal?', 'Avisar en el momento — esto me está activando — en vez de bloquear.'),
 (17,3,'primaria',    'Debajo de mi enfado o mi silencio, ¿qué siento de verdad: miedo, tristeza, vergüenza?', 'Compartir la emoción de debajo, no la reacción de encima.'),
 (18,3,'necesidad',   '¿Qué necesito sentir de ti para estar tranquilo, y se lo he pedido con claridad?', 'Pedir una cosa concreta sin reproche, empezando por: me ayudaría que…'),
 (19,3,'reparar',     '¿Hay algo que dije o hice que dolió y todavía no reparé?', 'Una disculpa simple y sincera, sin un pero después.'),
 (20,3,'escucha2',    'Cuando me cuenta lo que le duele, ¿logro escuchar sin defenderme?', 'Escuchar su versión del ciclo sin interrumpir ni justificarme.'),
 (21,3,'cierre3',     '¿Qué entendí esta semana de por qué chocamos, que antes no veía?', 'Decirnos una cosa que cada uno hará distinto la próxima vez que pase.'),

-- ---- Semana 4 · Construir (22-30) ---------------------------------
 (22,4,'futuro',      '¿Cómo me gustaría que nos sintiéramos dentro de seis meses?', 'Escribir cada uno una frase de ese futuro y compartirla.'),
 (23,4,'ritual2',     '¿Qué ritual de estos días quiero que se quede para siempre?', 'Acordar un ritual diario pequeño y ponerle una hora fija.'),
 (24,4,'acuerdo',     '¿Qué acuerdo concreto nos ayudaría a no volver al viejo patrón?', 'Proponer un acuerdo y, si los dos estamos de acuerdo, anotarlo en el pacto.'),
 (25,4,'placer',      '¿Qué hacíamos juntos al principio, que disfrutábamos y dejamos de hacer?', 'Planear hacer esa cosa esta semana, con día y hora.'),
 (26,4,'gratitud2',   '¿Qué agradezco de estos 26 años que no cambiaría por nada?', 'Decírselo mirándolo a los ojos, sin prisa.'),
 (27,4,'cuidado',     '¿Qué necesito para cuidarme yo, sin que sea distancia de ti?', 'Compartir esa necesidad como un cuidado, no como un muro.'),
 (28,4,'nosotros',    '¿Qué significa para mí la palabra nosotros hoy, distinto de hace un mes?', 'Contarle qué cambió en mí durante este reto.'),
 (29,4,'eleccion',    'Si tuviera que elegirte otra vez hoy, ¿por qué lo haría?', 'Decirle por qué lo elijo, hoy, con todo lo que sé ahora.'),
 (30,4,'pacto_final', '¿Qué quiero que sea lo próximo para nosotros, después de estos 30 días?', 'Renovar el pacto juntos: escribir qué seguimos eligiendo.')

on conflict (day_number) do update set
  week_number = excluded.week_number,
  theme_key   = excluded.theme_key,
  question_es = excluded.question_es,
  gesture_es  = excluded.gesture_es;
