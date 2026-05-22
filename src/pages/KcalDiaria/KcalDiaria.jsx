// ─────────────────────────────────────────────────────────────────────────────
//  KcalDiaria.jsx  —  Arquitetura offline-first
//  localStorage = cache imediato / Supabase = persistência real
//  Cada refeição salva IMEDIATAMENTE nos dois lugares ao ser adicionada
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import "./KcalDiaria.css";

// ─────────────────────────────────────────────────────────────────────────────
//  TABELA NUTRICIONAL BASE
// ─────────────────────────────────────────────────────────────────────────────
const BASE_PADRAO = {

  // ── A ──────────────────────────────────────────────────────────────────────
  abacate:                   { kcal: 160, proteina: 2,    carboidrato: 9,    tipo: "grama"   },
  abacaxi:                   { kcal: 50,  proteina: 0.5,  carboidrato: 13,   tipo: "grama"   },
  abobrinha:                 { kcal: 17,  proteina: 1.2,  carboidrato: 3.1,  tipo: "grama"   },
  acai_polpa:                { kcal: 58,  proteina: 0.8,  carboidrato: 6.2,  tipo: "grama"   },
  acai_proteico:             { kcal: 130, proteina: 10,   carboidrato: 14,   tipo: "grama"   },
  acerola:                   { kcal: 33,  proteina: 0.9,  carboidrato: 8,    tipo: "grama"   },
  agua_de_coco:              { kcal: 19,  proteina: 0.7,  carboidrato: 3.7,  tipo: "ml"      },
  agua_saborizada:           { kcal: 8,   proteina: 0,    carboidrato: 2,    tipo: "ml"      },
  alcatra:                   { kcal: 219, proteina: 29,   carboidrato: 0,    tipo: "grama"   },
  alface:                    { kcal: 15,  proteina: 1.4,  carboidrato: 3,    tipo: "grama"   },
  almondega:                 { kcal: 250, proteina: 17,   carboidrato: 10,   tipo: "grama"   },
  ameixa:                    { kcal: 46,  proteina: 0.7,  carboidrato: 11,   tipo: "grama"   },
  ameixa_seca:               { kcal: 240, proteina: 2.2,  carboidrato: 64,   tipo: "grama"   },
  amendoim:                  { kcal: 567, proteina: 26,   carboidrato: 16,   tipo: "grama"   },
  arroz:                     { kcal: 130, proteina: 2.5,  carboidrato: 28,   tipo: "grama"   },
  arroz_carreteiro:          { kcal: 180, proteina: 8,    carboidrato: 20,   tipo: "grama"   },
  arroz_de_leite:            { kcal: 97,  proteina: 2.5,  carboidrato: 18,   tipo: "grama"   },
  arroz_integral:            { kcal: 111, proteina: 2.6,  carboidrato: 23,   tipo: "grama"   },
  arroz_parboilizado:        { kcal: 123, proteina: 2.9,  carboidrato: 26,   tipo: "grama"   },
  atum:                      { kcal: 132, proteina: 28,   carboidrato: 0,    tipo: "grama"   },
  aveia:                     { kcal: 389, proteina: 17,   carboidrato: 66,   tipo: "grama"   },
  azeite:                    { kcal: 884, proteina: 0,    carboidrato: 0,    tipo: "grama"   },

  // ── B ──────────────────────────────────────────────────────────────────────
  bacalhau:                  { kcal: 105, proteina: 23,   carboidrato: 0,    tipo: "grama"   },
  bacon:                     { kcal: 541, proteina: 37,   carboidrato: 1,    tipo: "grama"   },
  baiao_de_dois:             { kcal: 170, proteina: 6,    carboidrato: 24,   tipo: "grama"   },
  banana:                    { kcal: 89,  proteina: 1.1,  carboidrato: 23,   tipo: "grama"   },
  banana_prata:              { kcal: 98,  proteina: 1.3,  carboidrato: 26,   tipo: "grama"   },
  barra_proteina:            { kcal: 250, proteina: 20,   carboidrato: 20,   tipo: "unidade" },
  barra_whey:                { kcal: 210, proteina: 18,   carboidrato: 17,   tipo: "unidade" },
  batata_doce:               { kcal: 86,  proteina: 1.6,  carboidrato: 20,   tipo: "grama"   },
  batata_frita:              { kcal: 312, proteina: 3.4,  carboidrato: 41,   tipo: "grama"   },
  batata_inglesa:            { kcal: 77,  proteina: 2,    carboidrato: 17,   tipo: "grama"   },
  batata_palha:              { kcal: 520, proteina: 5,    carboidrato: 53,   tipo: "grama"   },
  bauru:                     { kcal: 320, proteina: 18,   carboidrato: 30,   tipo: "unidade" },
  beijinho:                  { kcal: 95,  proteina: 1.2,  carboidrato: 12,   tipo: "unidade" },
  berinjela:                 { kcal: 25,  proteina: 1,    carboidrato: 6,    tipo: "grama"   },
  beterraba:                 { kcal: 43,  proteina: 1.6,  carboidrato: 10,   tipo: "grama"   },
  bife_acebolado:            { kcal: 240, proteina: 28,   carboidrato: 4,    tipo: "grama"   },
  biscoito_agua_sal:         { kcal: 430, proteina: 10,   carboidrato: 72,   tipo: "grama"   },
  biscoito_maisena:          { kcal: 440, proteina: 8,    carboidrato: 76,   tipo: "grama"   },
  biscoito_oreo:             { kcal: 480, proteina: 5,    carboidrato: 71,   tipo: "grama"   },
  biscoito_recheado:         { kcal: 480, proteina: 5,    carboidrato: 65,   tipo: "grama"   },
  biscoito_trakinas:         { kcal: 470, proteina: 5,    carboidrato: 69,   tipo: "grama"   },
  bisteca_suina:             { kcal: 292, proteina: 25,   carboidrato: 0,    tipo: "grama"   },
  bisteca_boi:               { kcal: 220, proteina: 25,   carboidrato: 0,    tipo: "grama"   },
  bolo_ameixa:               { kcal: 300, proteina: 4,    carboidrato: 50,   tipo: "grama"   },
  bolo_chocolate_cobertura:  { kcal: 360, proteina: 5,    carboidrato: 50,   tipo: "grama"   },
  bolo_de_leite:             { kcal: 310, proteina: 6,    carboidrato: 45,   tipo: "grama"   },
  bolo_milho:                { kcal: 280, proteina: 5,    carboidrato: 40,   tipo: "grama"   },
  bolo_prestigio:            { kcal: 390, proteina: 5,    carboidrato: 52,   tipo: "grama"   },
  bolo_proteico:             { kcal: 230, proteina: 16,   carboidrato: 18,   tipo: "grama"   },
  bolo_saia:                 { kcal: 180, proteina: 3,    carboidrato: 28,   tipo: "unidade" },
  bolo_trigo:                { kcal: 310, proteina: 6,    carboidrato: 50,   tipo: "grama"   },
  bombom_sortido:            { kcal: 520, proteina: 5,    carboidrato: 58,   tipo: "grama"   },
  brigadeiro:                { kcal: 96,  proteina: 1.3,  carboidrato: 13,   tipo: "unidade" },
  brocolis:                  { kcal: 35,  proteina: 2.4,  carboidrato: 7,    tipo: "grama"   },
  brownie_fit:               { kcal: 250, proteina: 12,   carboidrato: 20,   tipo: "grama"   },
  buchada_bode:              { kcal: 210, proteina: 18,   carboidrato: 3,    tipo: "grama"   },
  burger_artesanal:          { kcal: 520, proteina: 30,   carboidrato: 36,   tipo: "unidade" },
  burger_bacon_cheddar:      { kcal: 580, proteina: 32,   carboidrato: 38,   tipo: "unidade" },
  burger_barbecue:           { kcal: 640, proteina: 34,   carboidrato: 44,   tipo: "unidade" },
  burger_catupiry:           { kcal: 610, proteina: 31,   carboidrato: 41,   tipo: "unidade" },
  burger_costela:            { kcal: 620, proteina: 35,   carboidrato: 40,   tipo: "unidade" },
  burger_duplo_smash:        { kcal: 710, proteina: 42,   carboidrato: 39,   tipo: "unidade" },
  burger_frango_crispy:      { kcal: 540, proteina: 28,   carboidrato: 42,   tipo: "unidade" },
  burger_onion_rings:        { kcal: 680, proteina: 33,   carboidrato: 48,   tipo: "unidade" },
  burger_picanha:            { kcal: 590, proteina: 34,   carboidrato: 37,   tipo: "unidade" },
  burger_vegano:             { kcal: 430, proteina: 18,   carboidrato: 45,   tipo: "unidade" },

  // ── C ──────────────────────────────────────────────────────────────────────
  cachorro_quente:           { kcal: 320, proteina: 12,   carboidrato: 32,   tipo: "unidade" },
  cafe:                      { kcal: 2,   proteina: 0.3,  carboidrato: 0,    tipo: "ml"      },
  cafe_com_leite:            { kcal: 35,  proteina: 2,    carboidrato: 4,    tipo: "ml"      },
  cafe_gelado:               { kcal: 40,  proteina: 1,    carboidrato: 8,    tipo: "ml"      },
  caipirinha:                { kcal: 110, proteina: 0,    carboidrato: 14,   tipo: "ml"      },
  caipiroska:                { kcal: 125, proteina: 0,    carboidrato: 15,   tipo: "ml"      },
  caju:                      { kcal: 43,  proteina: 0.8,  carboidrato: 11,   tipo: "grama"   },
  calabresa:                 { kcal: 310, proteina: 12,   carboidrato: 2,    tipo: "grama"   },
  caldo_feijao:              { kcal: 90,  proteina: 5,    carboidrato: 12,   tipo: "ml"      },
  california_roll:           { kcal: 130, proteina: 3.5,  carboidrato: 24,   tipo: "grama"   },
  camarao:                   { kcal: 99,  proteina: 24,   carboidrato: 0,    tipo: "grama"   },
  canja_galinha:             { kcal: 85,  proteina: 6,    carboidrato: 10,   tipo: "grama"   },
  caqui:                     { kcal: 71,  proteina: 0.6,  carboidrato: 19,   tipo: "grama"   },
  capuccino:                 { kcal: 45,  proteina: 2,    carboidrato: 6,    tipo: "ml"      },
  carne_boi_cozida:          { kcal: 215, proteina: 27,   carboidrato: 0,    tipo: "grama"   },
  carne_de_panela:           { kcal: 230, proteina: 27,   carboidrato: 2,    tipo: "grama"   },
  carne_de_sol:              { kcal: 250, proteina: 32,   carboidrato: 0,    tipo: "grama"   },
  carne_figado_boi:          { kcal: 135, proteina: 20,   carboidrato: 4,    tipo: "grama"   },
  carne_figado_galinha:      { kcal: 119, proteina: 17,   carboidrato: 1,    tipo: "grama"   },
  carne_moida:               { kcal: 254, proteina: 26,   carboidrato: 0,    tipo: "grama"   },
  carne_moida_cozida:        { kcal: 212, proteina: 26.7, carboidrato: 0,    tipo: "grama"   },
  carne_seca:                { kcal: 250, proteina: 35,   carboidrato: 0,    tipo: "grama"   },
  cartola:                   { kcal: 290, proteina: 5,    carboidrato: 40,   tipo: "grama"   },
  castanha_caju:             { kcal: 553, proteina: 18,   carboidrato: 30,   tipo: "grama"   },
  castanha_para:             { kcal: 659, proteina: 14,   carboidrato: 12,   tipo: "grama"   },
  cenoura:                   { kcal: 41,  proteina: 0.9,  carboidrato: 10,   tipo: "grama"   },
  cerveja:                   { kcal: 43,  proteina: 0.5,  carboidrato: 4,    tipo: "ml"      },
  cha_camomila:              { kcal: 1,   proteina: 0,    carboidrato: 0,    tipo: "ml"      },
  cha_hortela:               { kcal: 1,   proteina: 0,    carboidrato: 0,    tipo: "ml"      },
  cha_verde:                 { kcal: 1,   proteina: 0,    carboidrato: 0,    tipo: "ml"      },
  cheeseburger:              { kcal: 340, proteina: 17,   carboidrato: 31,   tipo: "unidade" },
  chia:                      { kcal: 486, proteina: 17,   carboidrato: 42,   tipo: "grama"   },
  chiclete:                  { kcal: 5,   proteina: 0,    carboidrato: 1.2,  tipo: "unidade" },
  chocolate_ao_leite:        { kcal: 535, proteina: 7,    carboidrato: 59,   tipo: "grama"   },
  churrasco:                 { kcal: 280, proteina: 26,   carboidrato: 0,    tipo: "grama"   },
  coco_seco:                 { kcal: 660, proteina: 7,    carboidrato: 24,   tipo: "grama"   },
  cookie_proteico:           { kcal: 430, proteina: 22,   carboidrato: 38,   tipo: "grama"   },
  cookie_recheado:           { kcal: 490, proteina: 6,    carboidrato: 60,   tipo: "grama"   },
  costela_bovina:            { kcal: 320, proteina: 25,   carboidrato: 0,    tipo: "grama"   },
  couve:                     { kcal: 32,  proteina: 3,    carboidrato: 6,    tipo: "grama"   },
  coxa_frango_assada:        { kcal: 215, proteina: 27,   carboidrato: 0,    tipo: "grama"   },
  coxa_frango_frita:         { kcal: 260, proteina: 25,   carboidrato: 8,    tipo: "grama"   },
  coxinha:                   { kcal: 280, proteina: 10,   carboidrato: 28,   tipo: "unidade" },
  creme_de_leite:            { kcal: 221, proteina: 1.5,  carboidrato: 4,    tipo: "grama"   },
  creme_proteico:            { kcal: 180, proteina: 20,   carboidrato: 8,    tipo: "grama"   },
  crepioca:                  { kcal: 180, proteina: 8,    carboidrato: 20,   tipo: "grama"   },
  crepioca_fit:              { kcal: 170, proteina: 14,   carboidrato: 15,   tipo: "grama"   },
  croissant:                 { kcal: 406, proteina: 8,    carboidrato: 45,   tipo: "grama"   },
  cupim:                     { kcal: 330, proteina: 26,   carboidrato: 0,    tipo: "grama"   },
  curau:                     { kcal: 148, proteina: 3,    carboidrato: 25,   tipo: "grama"   },
  cuscuz:                    { kcal: 112, proteina: 3.8,  carboidrato: 25,   tipo: "grama"   },
  cuscuz_com_charque:        { kcal: 240, proteina: 15,   carboidrato: 21,   tipo: "grama"   },
  cuscuz_com_manteiga:       { kcal: 160, proteina: 4,    carboidrato: 22,   tipo: "grama"   },
  cuscuz_com_ovo:            { kcal: 190, proteina: 9,    carboidrato: 20,   tipo: "grama"   },

  // ── D ──────────────────────────────────────────────────────────────────────
  dadinho_tapioca:           { kcal: 320, proteina: 7,    carboidrato: 32,   tipo: "grama"   },
  danette:                   { kcal: 140, proteina: 3,    carboidrato: 20,   tipo: "grama"   },
  danone_zero:               { kcal: 25,  proteina: 2.5,  carboidrato: 4,    tipo: "ml"      },
  dobradinha:                { kcal: 180, proteina: 15,   carboidrato: 6,    tipo: "grama"   },
  doce_de_leite:             { kcal: 315, proteina: 5,    carboidrato: 55,   tipo: "grama"   },
  drink_tropical:            { kcal: 120, proteina: 0,    carboidrato: 18,   tipo: "ml"      },

  // ── E ──────────────────────────────────────────────────────────────────────
  empada_frango:             { kcal: 295, proteina: 9,    carboidrato: 24,   tipo: "unidade" },
  empanado_peixe:            { kcal: 220, proteina: 15,   carboidrato: 14,   tipo: "grama"   },
  energetico_fusion:         { kcal: 42,  proteina: 0,    carboidrato: 10,   tipo: "ml"      },
  energetico_monster:        { kcal: 47,  proteina: 0,    carboidrato: 12,   tipo: "ml"      },
  energetico_redbull:        { kcal: 45,  proteina: 0,    carboidrato: 11,   tipo: "ml"      },
  energetico_tnt:            { kcal: 44,  proteina: 0,    carboidrato: 11,   tipo: "ml"      },
  energetico_zero:           { kcal: 3,   proteina: 0,    carboidrato: 0.5,  tipo: "ml"      },
  enroladinho_salsicha:      { kcal: 310, proteina: 9,    carboidrato: 30,   tipo: "unidade" },
  ervilha:                   { kcal: 81,  proteina: 5.4,  carboidrato: 14,   tipo: "grama"   },
  escondidinho_carne:        { kcal: 190, proteina: 10,   carboidrato: 18,   tipo: "grama"   },
  escondidinho_carne_sol:    { kcal: 240, proteina: 12,   carboidrato: 20,   tipo: "grama"   },
  espinafre:                 { kcal: 23,  proteina: 2.9,  carboidrato: 3.6,  tipo: "grama"   },
  estrogonofe_frango:        { kcal: 180, proteina: 14,   carboidrato: 7,    tipo: "grama"   },

  // ── F ──────────────────────────────────────────────────────────────────────
  farinha_mandioca:          { kcal: 361, proteina: 1.6,  carboidrato: 87,   tipo: "grama"   },
  farinha_trigo:             { kcal: 364, proteina: 10,   carboidrato: 76,   tipo: "grama"   },
  farofa:                    { kcal: 350, proteina: 2,    carboidrato: 70,   tipo: "grama"   },
  feijao:                    { kcal: 76,  proteina: 4.8,  carboidrato: 14,   tipo: "grama"   },
  feijao_preto:              { kcal: 77,  proteina: 5,    carboidrato: 14,   tipo: "grama"   },
  feijao_verde:              { kcal: 90,  proteina: 6,    carboidrato: 15,   tipo: "grama"   },
  feijoada:                  { kcal: 152, proteina: 10,   carboidrato: 12,   tipo: "grama"   },
  file_peixe:                { kcal: 120, proteina: 22,   carboidrato: 0,    tipo: "grama"   },
  fini:                      { kcal: 340, proteina: 4,    carboidrato: 78,   tipo: "grama"   },
  frango_cozido:             { kcal: 190, proteina: 29,   carboidrato: 0,    tipo: "grama"   },
  frango_desfiado_fit:       { kcal: 160, proteina: 31,   carboidrato: 0,    tipo: "grama"   },
  frango_empanado:           { kcal: 260, proteina: 20,   carboidrato: 20,   tipo: "grama"   },
  frango_sobrecoxa_assada:   { kcal: 209, proteina: 26,   carboidrato: 0,    tipo: "grama"   },
  frango_sobrecoxa_frita:    { kcal: 250, proteina: 24,   carboidrato: 5,    tipo: "grama"   },
  frappuccino:               { kcal: 65,  proteina: 2,    carboidrato: 10,   tipo: "ml"      },
  fricasse_frango:           { kcal: 180, proteina: 12,   carboidrato: 10,   tipo: "grama"   },

  // ── G ──────────────────────────────────────────────────────────────────────
  galinha_cozida:            { kcal: 220, proteina: 28,   carboidrato: 0,    tipo: "grama"   },
  gelatina:                  { kcal: 70,  proteina: 1.5,  carboidrato: 17,   tipo: "grama"   },
  gin_tonica:                { kcal: 85,  proteina: 0,    carboidrato: 7,    tipo: "ml"      },
  goiaba:                    { kcal: 68,  proteina: 2.6,  carboidrato: 14,   tipo: "grama"   },
  granola:                   { kcal: 471, proteina: 10,   carboidrato: 64,   tipo: "grama"   },
  granola_proteica:          { kcal: 420, proteina: 24,   carboidrato: 40,   tipo: "grama"   },
  grao_de_bico:              { kcal: 164, proteina: 8.9,  carboidrato: 27,   tipo: "grama"   },
  guarana_natural:           { kcal: 55,  proteina: 0,    carboidrato: 14,   tipo: "ml"      },
  gyoza:                     { kcal: 70,  proteina: 3,    carboidrato: 8,    tipo: "unidade" },

  // ── H ──────────────────────────────────────────────────────────────────────
  hamburguer:                { kcal: 295, proteina: 17,   carboidrato: 30,   tipo: "unidade" },
  hamburguer_caseiro:        { kcal: 250, proteina: 20,   carboidrato: 20,   tipo: "unidade" },
  hamburguer_fit:            { kcal: 220, proteina: 24,   carboidrato: 10,   tipo: "unidade" },
  harumaki:                  { kcal: 130, proteina: 4,    carboidrato: 15,   tipo: "unidade" },
  hossomaki_kani:            { kcal: 120, proteina: 4,    carboidrato: 20,   tipo: "grama"   },
  hossomaki_pepino:          { kcal: 90,  proteina: 2,    carboidrato: 18,   tipo: "grama"   },
  hot_dog_duplo:             { kcal: 480, proteina: 18,   carboidrato: 40,   tipo: "unidade" },
  hot_roll:                  { kcal: 240, proteina: 7,    carboidrato: 28,   tipo: "grama"   },

  // ── I ──────────────────────────────────────────────────────────────────────
  inhame:                    { kcal: 97,  proteina: 2,    carboidrato: 23,   tipo: "grama"   },
  iogurte:                   { kcal: 59,  proteina: 10,   carboidrato: 3,    tipo: "grama"   },
  iogurte_grego:             { kcal: 97,  proteina: 10,   carboidrato: 4,    tipo: "grama"   },
  iogurte_proteico:          { kcal: 75,  proteina: 15,   carboidrato: 5,    tipo: "grama"   },
  isotonico:                 { kcal: 24,  proteina: 0,    carboidrato: 6,    tipo: "ml"      },

  // ── J ──────────────────────────────────────────────────────────────────────
  jaca:                      { kcal: 95,  proteina: 1.7,  carboidrato: 23,   tipo: "grama"   },
  joe_salmao:                { kcal: 95,  proteina: 5,    carboidrato: 8,    tipo: "unidade" },

  // ── K ──────────────────────────────────────────────────────────────────────
  ketchup:                   { kcal: 112, proteina: 1.3,  carboidrato: 27,   tipo: "grama"   },
  kitkat:                    { kcal: 518, proteina: 6,    carboidrato: 63,   tipo: "grama"   },
  kiwi:                      { kcal: 61,  proteina: 1.1,  carboidrato: 15,   tipo: "grama"   },

  // ── L ──────────────────────────────────────────────────────────────────────
  lamen:                     { kcal: 120, proteina: 5,    carboidrato: 18,   tipo: "grama"   },
  laranja:                   { kcal: 47,  proteina: 0.9,  carboidrato: 12,   tipo: "grama"   },
  lasanha:                   { kcal: 160, proteina: 10,   carboidrato: 20,   tipo: "grama"   },
  lasanha_frango:            { kcal: 165, proteina: 11,   carboidrato: 18,   tipo: "grama"   },
  legumes:                   { kcal: 20,  proteina: 1,    carboidrato: 18,   tipo: "grama"   },
  leite:                     { kcal: 42,  proteina: 3.4,  carboidrato: 5,    tipo: "ml"      },
  leite_condensado:          { kcal: 321, proteina: 7.5,  carboidrato: 55,   tipo: "grama"   },
  leite_desnatado:           { kcal: 34,  proteina: 3.4,  carboidrato: 5,    tipo: "ml"      },
  leite_integral:            { kcal: 61,  proteina: 3.2,  carboidrato: 5,    tipo: "ml"      },
  lentilha:                  { kcal: 116, proteina: 9,    carboidrato: 20,   tipo: "grama"   },
  linguica:                  { kcal: 301, proteina: 12,   carboidrato: 2,    tipo: "grama"   },

  // ── M ──────────────────────────────────────────────────────────────────────
  maca:                      { kcal: 52,  proteina: 0.3,  carboidrato: 14,   tipo: "grama"   },
  maca_verde:                { kcal: 48,  proteina: 0.3,  carboidrato: 13,   tipo: "grama"   },
  macaxeira_frita:           { kcal: 310, proteina: 2,    carboidrato: 42,   tipo: "grama"   },
  macarrao:                  { kcal: 131, proteina: 5,    carboidrato: 25,   tipo: "grama"   },
  maionese:                  { kcal: 680, proteina: 1,    carboidrato: 1,    tipo: "grama"   },
  mamao:                     { kcal: 43,  proteina: 0.5,  carboidrato: 11,   tipo: "grama"   },
  mandioca_cozida:           { kcal: 125, proteina: 0.6,  carboidrato: 30,   tipo: "grama"   },
  mandioquinha:              { kcal: 80,  proteina: 0.9,  carboidrato: 19,   tipo: "grama"   },
  manga:                     { kcal: 60,  proteina: 0.8,  carboidrato: 15,   tipo: "grama"   },
  manteiga:                  { kcal: 717, proteina: 0.9,  carboidrato: 0,    tipo: "grama"   },
  maracuja:                  { kcal: 97,  proteina: 2.2,  carboidrato: 23,   tipo: "grama"   },
  margarita:                 { kcal: 95,  proteina: 0,    carboidrato: 11,   tipo: "ml"      },
  mel:                       { kcal: 304, proteina: 0.3,  carboidrato: 82,   tipo: "grama"   },
  melancia:                  { kcal: 30,  proteina: 0.6,  carboidrato: 8,    tipo: "grama"   },
  melao:                     { kcal: 34,  proteina: 0.8,  carboidrato: 8,    tipo: "grama"   },
  milho:                     { kcal: 86,  proteina: 3.4,  carboidrato: 19,   tipo: "grama"   },
  milho_verde_cozido:        { kcal: 96,  proteina: 3.4,  carboidrato: 21,   tipo: "grama"   },
  missoshiro:                { kcal: 40,  proteina: 3,    carboidrato: 4,    tipo: "ml"      },
  misto_quente:              { kcal: 290, proteina: 14,   carboidrato: 26,   tipo: "unidade" },
  mocoto:                    { kcal: 190, proteina: 18,   carboidrato: 2,    tipo: "grama"   },
  mojito:                    { kcal: 80,  proteina: 0,    carboidrato: 10,   tipo: "ml"      },
  molho_tomate:              { kcal: 38,  proteina: 1.5,  carboidrato: 7,    tipo: "grama"   },
  morango:                   { kcal: 32,  proteina: 0.7,  carboidrato: 8,    tipo: "grama"   },
  mortadela:                 { kcal: 269, proteina: 12,   carboidrato: 3,    tipo: "grama"   },
  mousse_maracuja:           { kcal: 220, proteina: 3,    carboidrato: 30,   tipo: "grama"   },
  mungunza:                  { kcal: 140, proteina: 4,    carboidrato: 26,   tipo: "grama"   },

  // ── N ──────────────────────────────────────────────────────────────────────
  nhoque:                    { kcal: 160, proteina: 4,    carboidrato: 32,   tipo: "grama"   },
  niguiri_camarao:           { kcal: 55,  proteina: 4,    carboidrato: 7,    tipo: "unidade" },
  niguiri_salmao:            { kcal: 62,  proteina: 4,    carboidrato: 7,    tipo: "unidade" },
  nuggets:                   { kcal: 296, proteina: 15,   carboidrato: 18,   tipo: "grama"   },
  nutella:                   { kcal: 539, proteina: 6,    carboidrato: 57,   tipo: "grama"   },

  // ── O ──────────────────────────────────────────────────────────────────────
  omelete:                   { kcal: 154, proteina: 11,   carboidrato: 2,    tipo: "unidade" },
  onion_rings:               { kcal: 320, proteina: 4,    carboidrato: 40,   tipo: "grama"   },
  overnight_oats:            { kcal: 140, proteina: 7,    carboidrato: 20,   tipo: "grama"   },
  ouro_branco:               { kcal: 540, proteina: 6,    carboidrato: 56,   tipo: "grama"   },
  ovo_clar:                  { kcal: 17,  proteina: 3.6,  carboidrato: 0.2,  tipo: "unidade" },
  ovo_cozido_gramas:         { kcal: 143, proteina: 12.4, carboidrato: 0.7,  tipo: "grama"   },
  ovo_cozido_unidade:        { kcal: 78,  proteina: 6.3,  carboidrato: 0.6,  tipo: "unidade" },
  ovo_frito:                 { kcal: 90,  proteina: 6,    carboidrato: 0.5,  tipo: "unidade" },
  ovo_gema:                  { kcal: 55,  proteina: 2.7,  carboidrato: 0.6,  tipo: "unidade" },
  ovo_mexido:                { kcal: 100, proteina: 6,    carboidrato: 1,    tipo: "unidade" },
  ovo_unidade:               { kcal: 70,  proteina: 6,    carboidrato: 0.6,  tipo: "unidade" },

  // ── P ──────────────────────────────────────────────────────────────────────
  pacoca:                    { kcal: 110, proteina: 3,    carboidrato: 9,    tipo: "unidade" },
  pacoca_carne_seca:         { kcal: 320, proteina: 18,   carboidrato: 22,   tipo: "grama"   },
  pamonha:                   { kcal: 165, proteina: 4,    carboidrato: 33,   tipo: "grama"   },
  panqueca:                  { kcal: 227, proteina: 6,    carboidrato: 28,   tipo: "grama"   },
  panqueca_proteica:         { kcal: 190, proteina: 20,   carboidrato: 12,   tipo: "grama"   },
  pao_frances:               { kcal: 135, proteina: 4.5,  carboidrato: 28,   tipo: "unidade" },
  pao_gramas:                { kcal: 265, proteina: 9,    carboidrato: 49,   tipo: "grama"   },
  pao_integral:              { kcal: 247, proteina: 13,   carboidrato: 41,   tipo: "grama"   },
  pao_proteico:              { kcal: 260, proteina: 22,   carboidrato: 20,   tipo: "grama"   },
  pasta_amendoim_acucar:     { kcal: 610, proteina: 22,   carboidrato: 30,   tipo: "grama"   },
  pasta_amendoim_integral:   { kcal: 588, proteina: 25,   carboidrato: 20,   tipo: "grama"   },
  pasta_castanha_fit:        { kcal: 590, proteina: 20,   carboidrato: 18,   tipo: "grama"   },
  pastel_carne:              { kcal: 320, proteina: 12,   carboidrato: 28,   tipo: "unidade" },
  pastel_queijo:             { kcal: 340, proteina: 10,   carboidrato: 30,   tipo: "unidade" },
  patinho_moido:             { kcal: 176, proteina: 26,   carboidrato: 0,    tipo: "grama"   },
  peito_frango:              { kcal: 165, proteina: 31,   carboidrato: 0,    tipo: "grama"   },
  peito_frango_cozido:       { kcal: 163, proteina: 31,   carboidrato: 0,    tipo: "grama"   },
  peito_peru:                { kcal: 104, proteina: 17,   carboidrato: 2,    tipo: "grama"   },
  peixe_tilapia:             { kcal: 96,  proteina: 20,   carboidrato: 0,    tipo: "grama"   },
  pepino:                    { kcal: 15,  proteina: 0.7,  carboidrato: 3.6,  tipo: "grama"   },
  pera:                      { kcal: 57,  proteina: 0.4,  carboidrato: 15,   tipo: "grama"   },
  pessego:                   { kcal: 39,  proteina: 0.9,  carboidrato: 10,   tipo: "grama"   },
  picanha:                   { kcal: 250, proteina: 26,   carboidrato: 0,    tipo: "grama"   },
  pipoca:                    { kcal: 387, proteina: 13,   carboidrato: 78,   tipo: "grama"   },
  pirão:                     { kcal: 120, proteina: 2,    carboidrato: 24,   tipo: "grama"   },
  pizza_4_queijos:           { kcal: 360, proteina: 14,   carboidrato: 30,   tipo: "fatia"   },
  pizza_atum:                { kcal: 300, proteina: 15,   carboidrato: 31,   tipo: "fatia"   },
  pizza_bacon:               { kcal: 370, proteina: 14,   carboidrato: 32,   tipo: "fatia"   },
  pizza_baiana:              { kcal: 360, proteina: 13,   carboidrato: 35,   tipo: "fatia"   },
  pizza_banana_canela:       { kcal: 390, proteina: 5,    carboidrato: 58,   tipo: "fatia"   },
  pizza_brocolis:            { kcal: 280, proteina: 10,   carboidrato: 32,   tipo: "fatia"   },
  pizza_calabresa:           { kcal: 310, proteina: 12,   carboidrato: 34,   tipo: "fatia"   },
  pizza_carne_seca:          { kcal: 345, proteina: 16,   carboidrato: 33,   tipo: "fatia"   },
  pizza_chocolate:           { kcal: 410, proteina: 6,    carboidrato: 55,   tipo: "fatia"   },
  pizza_fit:                 { kcal: 180, proteina: 18,   carboidrato: 14,   tipo: "grama"   },
  pizza_frango_catupiry:     { kcal: 340, proteina: 15,   carboidrato: 32,   tipo: "fatia"   },
  pizza_mussarela:           { kcal: 290, proteina: 11,   carboidrato: 33,   tipo: "fatia"   },
  pizza_pepperoni:           { kcal: 350, proteina: 14,   carboidrato: 33,   tipo: "fatia"   },
  pizza_portuguesa:          { kcal: 320, proteina: 13,   carboidrato: 35,   tipo: "fatia"   },
  pizza_siciliana:           { kcal: 325, proteina: 12,   carboidrato: 34,   tipo: "fatia"   },
  pizza_strogonoff:          { kcal: 350, proteina: 14,   carboidrato: 34,   tipo: "fatia"   },
  prestigio:                 { kcal: 486, proteina: 4,    carboidrato: 59,   tipo: "grama"   },
  presunto:                  { kcal: 145, proteina: 21,   carboidrato: 1.5,  tipo: "grama"   },
  pudim_leite:               { kcal: 250, proteina: 6,    carboidrato: 35,   tipo: "grama"   },
  pure_batata:               { kcal: 110, proteina: 2,    carboidrato: 17,   tipo: "grama"   },

  // ── Q ──────────────────────────────────────────────────────────────────────
  queijo:                    { kcal: 402, proteina: 25,   carboidrato: 1,    tipo: "grama"   },
  queijo_cheddar:            { kcal: 403, proteina: 25,   carboidrato: 1,    tipo: "grama"   },
  queijo_coalho_assado:      { kcal: 320, proteina: 20,   carboidrato: 3,    tipo: "grama"   },
  queijo_mussarela:          { kcal: 280, proteina: 22,   carboidrato: 2,    tipo: "grama"   },
  queijo_prato:              { kcal: 360, proteina: 23,   carboidrato: 2,    tipo: "grama"   },
  quibe_frito:               { kcal: 290, proteina: 14,   carboidrato: 22,   tipo: "grama"   },

  // ── R ──────────────────────────────────────────────────────────────────────
  rabada:                    { kcal: 280, proteina: 24,   carboidrato: 0,    tipo: "grama"   },
  rap10:                     { kcal: 297, proteina: 8,    carboidrato: 49,   tipo: "grama"   },
  refrigerante_coca_cola:    { kcal: 42,  proteina: 0,    carboidrato: 11,   tipo: "ml"      },
  refrigerante_guarana:      { kcal: 40,  proteina: 0,    carboidrato: 10,   tipo: "ml"      },
  refrigerante_kwat:         { kcal: 26,  proteina: 0,    carboidrato: 7,    tipo: "ml"      },
  refrigerante_zero:         { kcal: 1,   proteina: 0,    carboidrato: 0,    tipo: "ml"      },
  repolho:                   { kcal: 25,  proteina: 1.3,  carboidrato: 6,    tipo: "grama"   },
  requeijao:                 { kcal: 257, proteina: 9,    carboidrato: 3,    tipo: "grama"   },
  ricota:                    { kcal: 174, proteina: 11,   carboidrato: 3,    tipo: "grama"   },
  risoto:                    { kcal: 160, proteina: 4,    carboidrato: 24,   tipo: "grama"   },
  rucula:                    { kcal: 25,  proteina: 2.6,  carboidrato: 3.7,  tipo: "grama"   },

  // ── S ──────────────────────────────────────────────────────────────────────
  salada_mista:              { kcal: 35,  proteina: 2,    carboidrato: 7,    tipo: "grama"   },
  salgadinho_milho:          { kcal: 510, proteina: 7,    carboidrato: 57,   tipo: "grama"   },
  salmao:                    { kcal: 208, proteina: 20,   carboidrato: 0,    tipo: "grama"   },
  salsicha:                  { kcal: 300, proteina: 12,   carboidrato: 2,    tipo: "grama"   },
  sanduiche_natural:         { kcal: 240, proteina: 12,   carboidrato: 24,   tipo: "unidade" },
  sarapatel:                 { kcal: 240, proteina: 20,   carboidrato: 4,    tipo: "grama"   },
  sardinha:                  { kcal: 208, proteina: 25,   carboidrato: 0,    tipo: "grama"   },
  sashimi_peixe_branco:      { kcal: 110, proteina: 23,   carboidrato: 0,    tipo: "grama"   },
  shake_proteico:            { kcal: 90,  proteina: 15,   carboidrato: 5,    tipo: "ml"      },
  shawarma:                  { kcal: 250, proteina: 15,   carboidrato: 22,   tipo: "grama"   },
  snickers:                  { kcal: 488, proteina: 8,    carboidrato: 61,   tipo: "grama"   },
  soja_cozida:               { kcal: 172, proteina: 16.6, carboidrato: 10,   tipo: "grama"   },
  sonho_valsa:               { kcal: 530, proteina: 6,    carboidrato: 58,   tipo: "grama"   },
  sorvete:                   { kcal: 207, proteina: 3.5,  carboidrato: 24,   tipo: "grama"   },
  sorvete_proteico:          { kcal: 120, proteina: 10,   carboidrato: 14,   tipo: "grama"   },
  suco_abacaxi:              { kcal: 50,  proteina: 0.5,  carboidrato: 12,   tipo: "ml"      },
  suco_caju:                 { kcal: 40,  proteina: 0.5,  carboidrato: 10,   tipo: "ml"      },
  suco_goiaba:               { kcal: 45,  proteina: 0.6,  carboidrato: 11,   tipo: "ml"      },
  suco_laranja:              { kcal: 45,  proteina: 0.7,  carboidrato: 11,   tipo: "ml"      },
  suco_manga:                { kcal: 60,  proteina: 0.4,  carboidrato: 15,   tipo: "ml"      },
  suco_maracuja:             { kcal: 38,  proteina: 0.4,  carboidrato: 9,    tipo: "ml"      },
  suco_uva:                  { kcal: 60,  proteina: 0.5,  carboidrato: 15,   tipo: "ml"      },
  sunomono:                  { kcal: 35,  proteina: 1,    carboidrato: 7,    tipo: "grama"   },
  sushi:                     { kcal: 45,  proteina: 2,    carboidrato: 8,    tipo: "unidade" },

  // ── T ──────────────────────────────────────────────────────────────────────
  tangerina:                 { kcal: 53,  proteina: 0.8,  carboidrato: 13,   tipo: "grama"   },
  tapioca:                   { kcal: 358, proteina: 0.2,  carboidrato: 88,   tipo: "grama"   },
  tapioca_frango_catupiry:   { kcal: 320, proteina: 16,   carboidrato: 35,   tipo: "unidade" },
  tapioca_manteiga:          { kcal: 250, proteina: 1,    carboidrato: 40,   tipo: "grama"   },
  tapioca_recheada_queijo:   { kcal: 260, proteina: 8,    carboidrato: 38,   tipo: "unidade" },
  temaki_kani:               { kcal: 170, proteina: 8,    carboidrato: 22,   tipo: "unidade" },
  temaki_salmao:             { kcal: 190, proteina: 10,   carboidrato: 24,   tipo: "unidade" },
  temaki_skin:               { kcal: 230, proteina: 9,    carboidrato: 26,   tipo: "unidade" },
  tomate:                    { kcal: 18,  proteina: 0.9,  carboidrato: 3.9,  tipo: "grama"   },
  torrada:                   { kcal: 400, proteina: 10,   carboidrato: 70,   tipo: "grama"   },
  torresmo:                  { kcal: 610, proteina: 35,   carboidrato: 0,    tipo: "grama"   },
  torta_de_frango:           { kcal: 180, proteina: 8,    carboidrato: 20,   tipo: "grama"   },
  torta_fit_frango:          { kcal: 170, proteina: 15,   carboidrato: 12,   tipo: "grama"   },
  twix:                      { kcal: 495, proteina: 4.5,  carboidrato: 65,   tipo: "grama"   },

  // ── U ──────────────────────────────────────────────────────────────────────
  uramaki_salmao:            { kcal: 145, proteina: 6,    carboidrato: 22,   tipo: "grama"   },
  uramaki_skin:              { kcal: 190, proteina: 7,    carboidrato: 24,   tipo: "grama"   },
  uva:                       { kcal: 69,  proteina: 0.7,  carboidrato: 18,   tipo: "grama"   },
  uva_verde:                 { kcal: 69,  proteina: 0.7,  carboidrato: 18,   tipo: "grama"   },

  // ── V ──────────────────────────────────────────────────────────────────────
  vinagrete:                 { kcal: 35,  proteina: 1,    carboidrato: 6,    tipo: "grama"   },
  vitamina_banana:           { kcal: 90,  proteina: 3,    carboidrato: 15,   tipo: "ml"      },
  vodka_energetico:          { kcal: 95,  proteina: 0,    carboidrato: 8,    tipo: "ml"      },

  // ── W ──────────────────────────────────────────────────────────────────────
  waffle:                    { kcal: 291, proteina: 8,    carboidrato: 33,   tipo: "grama"   },
  whey:                      { kcal: 427, proteina: 73,   carboidrato: 10,   tipo: "grama"   },
  whisky_cola:               { kcal: 90,  proteina: 0,    carboidrato: 8,    tipo: "ml"      },
  wrap_fit:                  { kcal: 190, proteina: 16,   carboidrato: 18,   tipo: "unidade" },

  // ── Y ──────────────────────────────────────────────────────────────────────
  yakimeshi:                 { kcal: 180, proteina: 6,    carboidrato: 28,   tipo: "grama"   },
  yakisoba:                  { kcal: 140, proteina: 6,    carboidrato: 20,   tipo: "grama"   },
  yakult:                    { kcal: 65,  proteina: 1.5,  carboidrato: 14,   tipo: "unidade" },

};

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

const formatarNome = (key) =>
  key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const dataInputHoje = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const inputParaDataBR = (valor) => {
  if (!valor) return dataHoje();
  const [yyyy, mm, dd] = valor.split("-");
  return `${dd}/${mm}/${yyyy}`;
};

const criarTimestamp = (dataInput, hora) => {
  if (!dataInput) return new Date().toISOString();
  return new Date(`${dataInput}T${hora || horaAgora()}:00`).toISOString();
};


const dataHoje = () => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const horaAgora = () => {
  const d  = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const calcularTotais = (refeicoes) =>
  refeicoes.reduce(
    (acc, ref) =>
      (ref.itens || []).reduce(
        (a, item) => ({
          kcal:        a.kcal        + (item.kcal        || 0),
          proteina:    a.proteina    + (item.proteina    || 0),
          carboidrato: a.carboidrato + (item.carboidrato || 0),
        }),
        acc
      ),
    { kcal: 0, proteina: 0, carboidrato: 0 }
  );

// ─────────────────────────────────────────────────────────────────────────────
//  CACHE LOCAL  (chave = "refeicoes_HOJE")
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_KEY = () => `refeicoes_${dataHoje()}`;

const lerCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const salvarCache = (refeicoes) => {
  try {
    localStorage.setItem(CACHE_KEY(), JSON.stringify(refeicoes));
    // Notifica Home dos totais atualizados
    const { kcal, proteina } = calcularTotais(refeicoes);
    localStorage.setItem("KcalDoDia",     String(kcal));
    localStorage.setItem("ProteinaDoDia", String(proteina));
    window.dispatchEvent(new Event("kcalAtualizada"));
  } catch {
    console.warn("localStorage cheio ou indisponível");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
function KcalDiaria({ onClose }) {

  const [dataRefeicaoTemp, setDataRefeicaoTemp] = useState(dataInputHoje);
  const navigate   = useNavigate();
  const isDesktop  = () => window.innerWidth >= 768;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  // ── Tabela nutricional ────────────────────────────────────────────────────
  const [tabela] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("alimentos")) || BASE_PADRAO;
    } catch {
      return BASE_PADRAO;
    }
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [notificacao, setNotificacao] = useState("");
  const mostrarNotificacao = useCallback((texto) => {
    setNotificacao(texto);
    setTimeout(() => setNotificacao(""), 3000);
  }, []);

  // ── Refeições — inicializa direto do cache (zero delay) ───────────────────
  const [refeicoes,  setRefeicoes]  = useState(lerCache);
  const [sincronizando, setSincronizando] = useState(false);

  // ── Refeição em montagem ──────────────────────────────────────────────────
  const [itensTemp,        setItensTemp]        = useState([]);
  const [nomeRefeicaoTemp, setNomeRefeicaoTemp] = useState("");
  const [editandoId,       setEditandoId]       = useState(null);

  // ── Animações ─────────────────────────────────────────────────────────────
  const [removendoId,  setRemovendoId]  = useState(null);
  const [animandoTemp, setAnimandoTemp] = useState(false);

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const [busca,            setBusca]            = useState("");
  const [alimento,         setAlimento]         = useState("");
  const [quantidade,       setQuantidade]       = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  //  SINCRONIZAÇÃO: carrega do Supabase APENAS se o cache estiver vazio
  //  Roda uma vez quando o user é identificado
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const sincronizar = async () => {
      const cacheAtual = lerCache();

      // Se já tem cache local, não faz request — UI já está populada
      if (cacheAtual.length > 0) return;

      setSincronizando(true);
      try {
        const { data, error } = await supabase
          .from("refeicoes")
          .select("*")
          .eq("user_id", user.id)
          .eq("datad",   dataHoje())
          .order("timestamp", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Normaliza formato vindo do Supabase
          const normalizadas = data.map((r) => ({
            id:        r.id,
            nome:      r.nome_refeicao || r.nome || "Refeição",
            datad:     r.datad,
            hora:      r.hora,
            timestamp: r.timestamp,
            itens:     r.itens || [],
          }));
          setRefeicoes(normalizadas);
          salvarCache(normalizadas);
        }
      } catch (e) {
        console.warn("Sync Supabase falhou (offline?):", e.message);
      } finally {
        setSincronizando(false);
      }
    };

    sincronizar();
  }, [user?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  //  TOTAIS + ANIMAÇÃO DOS CONTADORES
  // ─────────────────────────────────────────────────────────────────────────
  const totais = useMemo(() => calcularTotais(refeicoes), [refeicoes]);

  const animRef = useRef({ kcal: totais.kcal, proteina: totais.proteina, carbo: totais.carboidrato });
  const [kcalAnimada,     setKcalAnimada]     = useState(totais.kcal);
  const [proteinaAnimada, setProteinaAnimada] = useState(totais.proteina);
  const [carboAnimada,    setCarboAnimada]    = useState(totais.carboidrato);

  useEffect(() => {
    const inicio = { ...animRef.current };
    const alvo   = { kcal: totais.kcal, proteina: totais.proteina, carbo: totais.carboidrato };
    const STEPS  = 40;
    let count    = 0;

    const intervalo = setInterval(() => {
      count++;
      const p = count / STEPS;
      setKcalAnimada(    Math.round((inicio.kcal     || 0) + ((alvo.kcal     || 0) - (inicio.kcal     || 0)) * p));
      setProteinaAnimada(Math.round((inicio.proteina || 0) + ((alvo.proteina || 0) - (inicio.proteina || 0)) * p));
      setCarboAnimada(   Math.round((inicio.carbo    || 0) + ((alvo.carbo    || 0) - (inicio.carbo    || 0)) * p));

      if (count >= STEPS) {
        animRef.current = alvo;
        setKcalAnimada(alvo.kcal);
        setProteinaAnimada(alvo.proteina);
        setCarboAnimada(alvo.carbo);
        clearInterval(intervalo);
      }
    }, 900 / STEPS);

    return () => clearInterval(intervalo);
  }, [totais.kcal, totais.proteina, totais.carboidrato]);

  // ─────────────────────────────────────────────────────────────────────────
  //  AUTOCOMPLETE
  // ─────────────────────────────────────────────────────────────────────────
  const alimentosFiltrados = useMemo(
    () =>
      Object.keys(tabela).filter((key) =>
        key.replaceAll("_", " ").toLowerCase().includes(busca.toLowerCase())
      ),
    [tabela, busca]
  );

  const generateId = () => {
    // crypto.randomUUID só funciona em HTTPS/localhost
    // fallback manual para HTTP (desenvolvimento via IP)
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  };

  const placeholderQtd = () => {
    const tipo = tabela[alimento]?.tipo;
    if (tipo === "unidade") return "Quantidade";
    if (tipo === "ml")      return "ML";
    return "Gramas";
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  ADICIONAR ITEM À REFEIÇÃO EM MONTAGEM
  // ─────────────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!alimento || !quantidade) return;
    const q    = Number(quantidade);
    const base = tabela[alimento];
    if (!base || isNaN(q) || q <= 0) return;

    const fator = base.tipo === "grama" || base.tipo === "ml" ? q / 100 : q;

    setItensTemp((prev) => [
      ...prev,
      {
        nome:        alimento,
        quantidade:  q,
        tipo:        base.tipo,
        kcal:        Math.round(base.kcal        * fator),
        proteina:    Math.round(base.proteina    * fator),
        carboidrato: Math.round((base.carboidrato || 0) * fator),
      },
    ]);
    setQuantidade("");
    setBusca("");
    setAlimento("");
  };

  const userName = localStorage.getItem("nomeUsuario") || "";
  // ─────────────────────────────────────────────────────────────────────────
  //  CONFIRMAR REFEIÇÃO — salva LOCAL + SUPABASE imediatamente
  // ─────────────────────────────────────────────────────────────────────────
  const adicionarRefeicao = async () => {
  if (itensTemp.length === 0) return;

  const datadSelecionada = inputParaDataBR(dataRefeicaoTemp);
  const horaSelecionada = horaAgora();
  const refeicaoEhDeHoje = datadSelecionada === dataHoje();

  const novaRefeicao = {
    id: generateId(),
    nome: nomeRefeicaoTemp.trim() || `Refeição ${refeicaoEhDeHoje ? refeicoes.length + 1 : ""}`.trim(),
    datad: datadSelecionada,
    hora: horaSelecionada,
    timestamp: criarTimestamp(dataRefeicaoTemp, horaSelecionada),
    itens: itensTemp,
  };

  setAnimandoTemp(true);

  setTimeout(() => {
    if (refeicaoEhDeHoje) {
      setRefeicoes((prev) => {
        const novas = [...prev, novaRefeicao];
        salvarCache(novas);
        return novas;
      });
    }

    setItensTemp([]);
    setNomeRefeicaoTemp("");
    setDataRefeicaoTemp(dataInputHoje());
    setAnimandoTemp(false);

    if (!refeicaoEhDeHoje) {
      mostrarNotificacao(`Refeição salva em ${datadSelecionada}`);
      window.dispatchEvent(new Event("kcalAtualizada"));
    }
  }, 250);

  if (user?.id) {
    const totaisRef = calcularTotais([novaRefeicao]);

    supabase
      .from("refeicoes")
      .insert({
        id: novaRefeicao.id,
        user_id: user.id,
        nome_user: userName,
        datad: novaRefeicao.datad,
        hora: novaRefeicao.hora,
        timestamp: novaRefeicao.timestamp,
        nome_refeicao: novaRefeicao.nome,
        itens: novaRefeicao.itens,
        kcal_total: totaisRef.kcal,
        prot_total: totaisRef.proteina,
        carb_total: totaisRef.carboidrato,
      })
      .then(({ error }) => {
        if (error) {
          console.warn("Falha ao salvar refeição no Supabase:", error.message);
          mostrarNotificacao("Erro ao salvar refeição.");
          return;
        }

        window.dispatchEvent(new Event("kcalAtualizada"));
      });
  }
};


  // ─────────────────────────────────────────────────────────────────────────
  //  EXCLUIR REFEIÇÃO — remove LOCAL + SUPABASE
  // ─────────────────────────────────────────────────────────────────────────
  const excluirRefeicao = (id) => {
    setRemovendoId(id);
    setTimeout(() => {
      setRefeicoes((prev) => {
        const novas = prev.filter((r) => r.id !== id);
        salvarCache(novas);
        return novas;
      });
      setRemovendoId(null);
    }, 300);

    // Remove do Supabase pelo id
    if (user?.id) {
      supabase
        .from("refeicoes")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error) console.warn("Falha ao excluir refeição no Supabase:", error.message);
        });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="kcalContainer">

      {/* Toast */}
      {notificacao && <div className="toastNotificacao">{notificacao}</div>}

      {/* Voltar (só mobile) */}
      <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

      {/* Totais animados */}
      <div className="kcalHeader">
        <p className="contador">{kcalAnimada} K</p>
        <p className="contador">{proteinaAnimada} P</p>
        <p className="contador">{carboAnimada} C</p>
        {sincronizando && (
          <span className="syncIndicator" title="Sincronizando...">⟳</span>
        )}
      </div>

      <div className="finalizarDia">
        <p className="autoSaveInfo">
          Cada refeição é salva automaticamente assim que adicionada.
        </p>
      </div>

      {/* Autocomplete + quantidade + botão */}
      <div className="inputArea">
        <div className="autocompleteWrapper">
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={busca}
            autoComplete="off"
            onChange={(e) => {
              setBusca(e.target.value.replace(/[^a-zA-ZÀ-ú\s]/g, ""));
              setAlimento("");
            }}
            onFocus={() => setMostrarSugestoes(true)}
            onBlur={()  => setTimeout(() => setMostrarSugestoes(false), 150)}
          />

          {mostrarSugestoes && busca.length > 0 && alimentosFiltrados.length > 0 && (
            <ul className="sugestoesList">
              {alimentosFiltrados.slice(0, 8).map((key) => (
                <li
                  key={key}
                  onMouseDown={() => {
                    setAlimento(key);
                    setBusca(formatarNome(key));
                    setMostrarSugestoes(false);
                  }}
                >
                  {formatarNome(key)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <input
          className="tiposComida"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={placeholderQtd()}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
        />

        <button className="btnAdicionar" onClick={handleAdd}>
          Adicionar
        </button>
      </div>

      {/* Refeição em montagem */}
      <div className={`refeicaoAtual ${animandoTemp ? "fadeOut" : ""}`}>

        <div className="tituloDataRefeicao">
  {editandoId === "temp" ? (
    <input
      className="tituloEditavel"
      type="text"
      autoFocus
      placeholder="Nome da refeição..."
      value={nomeRefeicaoTemp}
      onChange={(e) => setNomeRefeicaoTemp(e.target.value)}
      onBlur={() => setEditandoId(null)}
      onKeyDown={(e) => { if (e.key === "Enter") setEditandoId(null); }}
    />
  ) : (
    <p className="tituloClicavel" onClick={() => setEditandoId("temp")}>
      {nomeRefeicaoTemp.trim() || "Refeição atual"}{" "}
      <span className="iconeLapis">✎</span>
    </p>
  )}

  <input
    className="inputDataRefeicao"
    type="date"
    value={dataRefeicaoTemp}
    onChange={(e) => setDataRefeicaoTemp(e.target.value)}
  />
</div>


        {itensTemp.map((item, index) => (
          <div key={index} className="item">
            <span>
              {formatarNome(item.nome)} ({item.quantidade}
              {item.tipo === "grama" ? "g" : item.tipo === "ml" ? "ml" : "un"})
            </span>
            <span className="refeicaoAtualKcal">{item.kcal} Kcal</span>
            <span className="refeicaoAtualProteina">{item.proteina} G</span>
            <span className="refeicaoAtualCarbo">{item.carboidrato} C</span>
          </div>
        ))}

        {itensTemp.length > 0 && (
          <div className="botoesRefeicao">
            <button onClick={() => setItensTemp([])}>Excluir refeição</button>
            <button onClick={adicionarRefeicao}>Adicionar refeição</button>
          </div>
        )}
      </div>

      {/* Refeições finalizadas */}
      <div className="lista">
        {refeicoes.map((ref) => {
          const totaisRef   = calcularTotais([ref]);
          const estaEditando = editandoId === ref.id;

          return (
            <div
              key={ref.id}
              className={`refeicaoMobile ${removendoId === ref.id ? "fadeOut" : ""}`}
            >
              <div className="topoRefeicao">

                {estaEditando ? (
                  <input
                    className="tituloRefeicao editando"
                    type="text"
                    autoFocus
                    value={ref.nome}
                    onChange={(e) => {
                      const novoNome = e.target.value;
                      setRefeicoes((prev) =>
                        prev.map((r) => r.id === ref.id ? { ...r, nome: novoNome } : r)
                      );
                    }}
                    onBlur={()   => setEditandoId(null)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditandoId(null); }}
                  />
                ) : (
                  <p className="tituloLinha" onClick={() => setEditandoId(ref.id)}>
                    {ref.nome}
                    <span className="iconeLapis"> ✎</span>
                  </p>
                )}

                <div className="resumoLinha">
                  <span>{totaisRef.kcal}k</span>
                  <span>{totaisRef.proteina}p</span>
                  <span>{totaisRef.carboidrato}c</span>
                </div>
              </div>

              {/* Hora da refeição */}
              {ref.hora && (
                <div className="refeicaoHora">{ref.hora}</div>
              )}

              <div className="itensRefeicao">
                {(ref.itens || []).map((item, i) => (
                  <p key={i} className="linhaItem">
                    {formatarNome(item.nome)} ({item.quantidade}
                    {item.tipo === "grama" ? "g" : item.tipo === "ml" ? "ml" : "un"})
                  </p>
                ))}
              </div>

              <div className="acoesRefeicao">
                <button onClick={() => excluirRefeicao(ref.id)}>
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default KcalDiaria;