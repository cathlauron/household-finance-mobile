import React, { useEffect, useLayoutEffect, useState } from 'react';
import { showSaved } from '../components/SavedToast';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { SheetBar, BigAmount, BigTotal, FormGroup, InputRow, AmountRow, GroupLabel } from '../components/SimpleForm';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import type { GroceryItem, GroceryCalcEntry, MealIdea, ManualTransaction } from '../types';
import SwipeableRow from '../components/SwipeableRow';
import SegmentedControl from '../components/SegmentedControl';
import BottomSheet from '../components/BottomSheet';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';
import { makeId } from '../utils';
import { todayISO } from '../dateUtils';
import { hapticLight, hapticSelection } from '../haptics';
import { useStickyState } from '../stickyState';

// Redesign: Groceries (Plan › Groceries), matching the Finance Flow mockup.
// List: tick items off as you shop; "Finish trip" adds what you bought to your spending.
// Calculator: add prices as you go to see what's in your cart against your plan.
// Meal ideas: meals with their ingredients; a meal costs the total of its ingredients,
// and one tap puts the ingredients on the list.

type Tab = 'list' | 'calc' | 'meals';
type Sheet = null | { kind: 'item'; id?: string } | { kind: 'meal'; id?: string };
type IngredientRow = { id: string; name: string; price: number | '' };

const SHOW_FIRST = 8;

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}
const itemCost = (g: GroceryItem) => (g.purchased && num(g.actualAmount) > 0 ? num(g.actualAmount) : num(g.plannedAmount));
const mealCost = (m: MealIdea) => (m.ingredients || []).reduce((s, i) => s + num(i.price), 0);

// A couple of everyday ideas to start from (no prices — those are yours to fill in).
const STARTERS: { name: string; ingredients: string[] }[] = [
  { name: 'Chicken adobo', ingredients: ['Chicken', 'Soy sauce', 'Vinegar', 'Garlic', 'Bay leaves'] },
  { name: 'Sinigang na baboy', ingredients: ['Pork ribs', 'Tamarind mix', 'Kangkong', 'Radish', 'Tomatoes'] },
];

export default function GroceriesScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);

  const [tab, setTab] = useStickyState<Tab>('groceries.tab', 'list');
  // The ingredient row just added, so its name field gets the cursor.
  const [focusIngredientId, setFocusIngredientId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  useEffect(() => setFocusIngredientId(null), [sheet]);
  const [nameIn, setNameIn] = useState('');
  const [plannedIn, setPlannedIn] = useState<number | ''>('');
  const [actualIn, setActualIn] = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  // Calculator inputs
  const [calcName, setCalcName] = useState('');
  const [calcPrice, setCalcPrice] = useState<number | ''>('');
  const [calcQty, setCalcQty] = useState<number | ''>(1);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => (tab === 'meals' ? openMeal() : openItem())}
          accessibilityRole="button"
          accessibilityLabel={tab === 'meals' ? 'Add a meal idea' : 'Add an item'}
          testID="groceries-add"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[headerButtonText, { color: colors.gold }]}>Add</Text>
        </TouchableOpacity>
      ),
    });
  });

  if (!model) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const items: GroceryItem[] = model.groceries ?? [];
  const calc: GroceryCalcEntry[] = model.groceryCalculator ?? [];
  const meals: MealIdea[] = model.mealIdeas ?? [];
  const planned = items.reduce((s, g) => s + num(g.plannedAmount), 0);
  const boughtItems = items.filter((g) => g.purchased);
  const bought = boughtItems.reduce((s, g) => s + itemCost(g), 0);
  const cart = calc.reduce((s, e) => s + num(e.amount), 0);
  const shown = showAll ? items : items.slice(0, SHOW_FIRST);

  function openItem(g?: GroceryItem) {
    setNameIn(g?.item ?? '');
    setPlannedIn(g && typeof g.plannedAmount === 'number' ? g.plannedAmount : '');
    setActualIn(g && typeof g.actualAmount === 'number' ? g.actualAmount : '');
    setSheet({ kind: 'item', id: g?.id });
  }

  function openMeal(m?: MealIdea) {
    setNameIn(m?.name ?? '');
    setIngredients(
      m ? m.ingredients.map((i) => ({ id: i.id, name: i.name, price: i.price })) : [{ id: makeId('ing'), name: '', price: '' }]
    );
    setSheet({ kind: 'meal', id: m?.id });
  }

  async function saveSheet() {
    if (!model || !sheet) return;
    const name = nameIn.trim();
    if (!name) {
      Alert.alert(sheet.kind === 'meal' ? 'Name the meal' : 'Name the item', 'Add a name first.');
      return;
    }
    if (sheet.kind === 'item') {
      const list = sheet.id
        ? items.map((g) => (g.id === sheet.id ? { ...g, item: name, plannedAmount: plannedIn, actualAmount: actualIn } : g))
        : [...items, { id: makeId('grocery'), item: name, plannedAmount: plannedIn, actualAmount: '' as const, purchased: false }];
      await saveModel({ ...model, groceries: list });
    } else {
      const ing = ingredients.filter((i) => i.name.trim()).map((i) => ({ id: i.id, name: i.name.trim(), price: i.price }));
      const list = sheet.id
        ? meals.map((m) => (m.id === sheet.id ? { ...m, name, ingredients: ing } : m))
        : [...meals, { id: makeId('meal'), name, ingredients: ing }];
      await saveModel({ ...model, mealIdeas: list });
    }
    hapticLight();
    setSheet(null);
  }

  function deleteFromSheet() {
    if (!model || !sheet?.id) return;
    const what = sheet.kind === 'meal' ? 'meal idea' : 'item';
    Alert.alert(`Delete this ${what}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (sheet.kind === 'meal') await saveModel({ ...model, mealIdeas: meals.filter((m) => m.id !== sheet.id) });
          else await saveModel({ ...model, groceries: items.filter((g) => g.id !== sheet.id) });
          setSheet(null);
        },
      },
    ]);
  }

  async function toggleBought(g: GroceryItem) {
    if (!model) return;
    hapticSelection();
    const on = !g.purchased;
    await saveModel({
      ...model,
      groceries: items.map((x) =>
        x.id === g.id ? { ...x, purchased: on, actualAmount: on && x.actualAmount === '' ? x.plannedAmount : x.actualAmount } : x
      ),
    });
  }

  function deleteItem(g: GroceryItem) {
    if (!model) return;
    Alert.alert('Delete this item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveModel({ ...model, groceries: items.filter((x) => x.id !== g.id) }) },
    ]);
  }

  // Adds what was bought to spending as one Groceries transaction and clears those items.
  function finishTrip() {
    if (!model || boughtItems.length === 0) return;
    Alert.alert(
      'Finish this trip?',
      `Adds ${formatPeso(bought)} to your spending as Groceries and clears the ${boughtItems.length} ticked ${boughtItems.length === 1 ? 'item' : 'items'} from the list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            const txn: ManualTransaction = {
              id: makeId('txn'),
              date: todayISO(),
              label: 'Groceries',
              amount: Math.round(bought * 100) / 100,
              direction: 'out',
              owner: 'shared',
              category: 'Groceries',
              notes: boughtItems.map((g) => g.item).join(', '),
            };
            await saveModel({
              ...model,
              manualTransactions: [...(model.manualTransactions || []), txn],
              groceries: items.filter((g) => !g.purchased),
            });
            hapticLight();
            showSaved('Trip added to spending');
          },
        },
      ]
    );
  }

  async function addCalc() {
    if (!model) return;
    const price = num(calcPrice);
    const qty = num(calcQty) > 0 ? num(calcQty) : 1;
    if (price <= 0) return;
    const entry: GroceryCalcEntry = { id: makeId('calc'), label: calcName.trim() || 'Item', amount: Math.round(price * qty * 100) / 100, qty, unitPrice: price };
    await saveModel({ ...model, groceryCalculator: [...calc, entry] });
    hapticLight();
    setCalcName('');
    setCalcPrice('');
    setCalcQty(1);
  }

  async function calcToList() {
    if (!model || calc.length === 0) return;
    const add: GroceryItem[] = calc.map((e) => ({ id: makeId('grocery'), item: e.label, plannedAmount: e.amount, actualAmount: '', purchased: false }));
    await saveModel({ ...model, groceries: [...items, ...add], groceryCalculator: [] });
    setTab('list');
  }

  async function addMealToList(m: MealIdea) {
    if (!model) return;
    const add: GroceryItem[] = m.ingredients.map((i) => ({ id: makeId('grocery'), item: i.name, plannedAmount: i.price, actualAmount: '', purchased: false }));
    await saveModel({ ...model, groceries: [...items, ...add] });
    hapticLight();
    Alert.alert('Added to your list', `${add.length} ${add.length === 1 ? 'ingredient' : 'ingredients'} from ${m.name}.`);
  }

  async function addStarters() {
    if (!model) return;
    const add: MealIdea[] = STARTERS.map((s) => ({
      id: makeId('meal'),
      name: s.name,
      ingredients: s.ingredients.map((n) => ({ id: makeId('ing'), name: n, price: '' as const })),
    }));
    await saveModel({ ...model, mealIdeas: [...meals, ...add] });
  }

  return (
    <View style={styles.container}>
      <View style={styles.segRow}>
        <SegmentedControl<Tab>
          accessibilityLabel="Groceries view"
          options={[
            { id: 'list', label: 'List' },
            { id: 'calc', label: 'Calculator' },
            { id: 'meals', label: 'Meal ideas' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'list' && (
        <PullToRefreshScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.group, styles.trio]}>
            <GradientFill match={styles.group} />
            <View style={styles.trioCell}>
              <Text style={styles.meta}>Planned</Text>
              <Text style={[styles.headline, { color: colors.planned }]}>{formatPeso(planned)}</Text>
            </View>
            <View style={[styles.trioCell, styles.trioLine]}>
              <Text style={styles.meta}>Bought</Text>
              <Text style={[styles.headline, { color: colors.negative }]}>{formatPeso(bought)}</Text>
            </View>
            <View style={[styles.trioCell, styles.trioLine]}>
              <Text style={styles.meta}>Items</Text>
              <Text style={styles.headline}>
                {boughtItems.length} of {items.length}
              </Text>
            </View>
          </View>

          <Text style={styles.header}>Shopping list</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {items.length === 0 && <Text style={[styles.meta, { padding: 16 }]}>Nothing on the list yet. Tap Add to add an item.</Text>}
            {shown.map((g, i) => (
              <SwipeableRow key={g.id} enabled={Boolean(model.settings.swipeToDeleteEnabled)} onDelete={() => deleteItem(g)} testID={`grocery-swipe-${g.id}`} flat>
                <View style={[styles.row, i > 0 && styles.line]}>
                  <TouchableOpacity
                    onPress={() => toggleBought(g)}
                    style={[styles.check, g.purchased && { backgroundColor: colors.buttonFill, borderColor: colors.buttonFill }]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: g.purchased }}
                    accessibilityLabel={`Mark ${g.item} as bought`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {g.purchased && <Ionicons name="checkmark" size={15} color={colors.onButton} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rowMain} onPress={() => openItem(g)} accessibilityRole="button">
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.title, g.purchased && styles.done]} numberOfLines={1}>
                        {g.item || 'Untitled item'}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {g.purchased && num(g.actualAmount) > 0 && num(g.actualAmount) !== num(g.plannedAmount)
                          ? `Paid ${formatPeso(num(g.actualAmount))}`
                          : num(g.plannedAmount) > 0
                            ? 'Planned'
                            : 'No price yet'}
                      </Text>
                    </View>
                    <Text style={[styles.amount, { color: g.purchased ? colors.inkDim : colors.planned }]}>
                      {num(itemCost(g)) > 0 ? formatPeso(itemCost(g)) : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </SwipeableRow>
            ))}
            {items.length > SHOW_FIRST && (
              <TouchableOpacity style={[styles.row, styles.line]} onPress={() => setShowAll((v) => !v)} accessibilityRole="button">
                <Text style={[styles.title, { color: colors.gold }]}>{showAll ? 'Show less' : `Show ${items.length - SHOW_FIRST} more`}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.footer}>Ticking an item off adds it to your spending when you finish the trip.</Text>

          {boughtItems.length > 0 && (
            <TouchableOpacity style={[styles.primary, { backgroundColor: colors.buttonFill }]} onPress={finishTrip} accessibilityRole="button" testID="groceries-finish">
              <GradientFill color={colors.buttonFill} strength={0.18} />
              <Text style={[styles.primaryText, { color: colors.onButton }]}>Finish trip · add {formatPeso(bought)}</Text>
            </TouchableOpacity>
          )}
        </PullToRefreshScrollView>
      )}

      {tab === 'calc' && (
        <PullToRefreshScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.group, { padding: 18, alignItems: 'center' }]}>
            <GradientFill match={styles.group} />
            <Text style={styles.meta}>In your cart</Text>
            <Text style={[styles.hero, { color: colors.planned }]}>{formatPeso(cart)}</Text>
            {planned > 0 && (
              <Text style={styles.subhead}>
                {cart <= planned
                  ? `${formatPeso(planned - cart)} left of the ${formatPeso(planned)} you planned`
                  : `${formatPeso(cart - planned)} over the ${formatPeso(planned)} you planned`}
              </Text>
            )}
          </View>

          {calc.length > 0 && (
            <View style={[styles.group, { marginTop: 20 }]}>
              <GradientFill match={styles.group} />
              {calc.map((e, i) => (
                <View key={e.id} style={[styles.row, i > 0 && styles.line]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.title} numberOfLines={1}>{e.label}</Text>
                    <Text style={styles.meta}>
                      {num(e.qty) || 1} × {formatPeso(num(e.unitPrice) || num(e.amount))}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: colors.planned }]}>{formatPeso(num(e.amount))}</Text>
                  <TouchableOpacity
                    onPress={() => saveModel({ ...model, groceryCalculator: calc.filter((x) => x.id !== e.id) })}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${e.label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.inkDim} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.header}>Add price</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            <View style={styles.row}>
              <TextInput style={styles.inlineInput} placeholder="Item (optional)" placeholderTextColor={colors.inkDim} value={calcName} onChangeText={setCalcName} />
            </View>
            <View style={[styles.row, styles.line, { gap: 10 }]}>
              <View style={{ flex: 2 }}>
                <AmountInput value={calcPrice} onChangeAmount={setCalcPrice} placeholder="Price" />
              </View>
              <View style={{ flex: 1 }}>
                <AmountInput value={calcQty} onChangeAmount={setCalcQty} prefix={null} suffix="×" placeholder="1" />
              </View>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.buttonFill }]} onPress={addCalc} accessibilityRole="button" accessibilityLabel="Add to cart" testID="calc-add">
                <GradientFill color={colors.buttonFill} strength={0.18} />
                <Ionicons name="add" size={24} color={colors.onButton} />
              </TouchableOpacity>
            </View>
          </View>

          {calc.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[styles.primary, { flex: 1, marginTop: 0, backgroundColor: colors.accentTint }]} onPress={calcToList} accessibilityRole="button">
                <GradientFill kind="tint" color={colors.accentTint} />
                <Text style={[styles.primaryText, { color: colors.gold }]}>Add all to list</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primary, { flex: 1, marginTop: 0, backgroundColor: colors.navy3 }]}
                onPress={() => saveModel({ ...model, groceryCalculator: [] })}
                accessibilityRole="button"
              >
                <GradientFill kind="surface" color={colors.navy3} />
                <Text style={[styles.primaryText, { color: colors.inkDim }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </PullToRefreshScrollView>
      )}

      {tab === 'meals' && (
        <PullToRefreshScrollView contentContainerStyle={styles.scroll}>
          {meals.length === 0 && (
            <View style={[styles.group, { padding: 16, gap: 12 }]}>
              <GradientFill match={styles.group} />
              <Text style={styles.subhead}>Save meals you cook often with their ingredients, then add them to your list in one tap.</Text>
              <TouchableOpacity style={[styles.primary, { marginTop: 0, backgroundColor: colors.accentTint }]} onPress={addStarters} accessibilityRole="button">
                <GradientFill kind="tint" color={colors.accentTint} />
                <Text style={[styles.primaryText, { color: colors.gold }]}>Start with adobo and sinigang</Text>
              </TouchableOpacity>
            </View>
          )}
          {meals.map((m) => {
            const cost = mealCost(m);
            return (
              <View key={m.id} style={[styles.group, { padding: 16, gap: 10, marginBottom: 12 }]}>
                <GradientFill match={styles.group} />
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'baseline' }} onPress={() => openMeal(m)} accessibilityRole="button" accessibilityLabel={`Edit ${m.name}`}>
                  <Text style={[styles.headline, { flex: 1 }]}>{m.name}</Text>
                  <Text style={[styles.amount, { color: colors.planned }]}>{cost > 0 ? formatPeso(cost) : 'Add prices'}</Text>
                </TouchableOpacity>
                <View style={styles.chips}>
                  {m.ingredients.map((i) => (
                    <View key={i.id} style={styles.chip}>
                      <Text style={styles.chipText}>{i.name}</Text>
                    </View>
                  ))}
                </View>
                {m.ingredients.length > 0 && (
                  <TouchableOpacity style={[styles.primary, { marginTop: 0, backgroundColor: colors.accentTint }]} onPress={() => addMealToList(m)} accessibilityRole="button">
                    <GradientFill kind="tint" color={colors.accentTint} />
                    <Text style={[styles.primaryText, { color: colors.gold }]}>
                      Add {m.ingredients.length} {m.ingredients.length === 1 ? 'ingredient' : 'ingredients'} to the list
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          {meals.length > 0 && <Text style={styles.footer}>A meal's cost is the total of its ingredients. Tap a meal's name to edit it.</Text>}
        </PullToRefreshScrollView>
      )}

      <BottomSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        grouped
        header={
          <SheetBar
            title={sheet?.kind === 'meal' ? (sheet.id ? 'Edit meal' : 'New meal') : sheet?.id ? 'Edit item' : 'New item'}
            onCancel={() => setSheet(null)}
            onDone={saveSheet}
            doneLabel={sheet?.id ? 'Save' : 'Add'}
          />
        }
      >
        {sheet?.kind === 'item' && (
          <>
            <BigAmount label="Planned price" value={plannedIn} onChange={setPlannedIn} color={colors.planned} />
            <FormGroup>
              <InputRow label="Item" value={nameIn} onChangeText={setNameIn} placeholder="e.g. Rice, 5 kg" autoFocus={!sheet.id} testID="groceries-name-input" />
              {!!sheet.id && <AmountRow label="What you paid" value={actualIn} onChange={setActualIn} placeholder="If different" />}
            </FormGroup>
          </>
        )}
        {sheet?.kind === 'meal' && (
          <>
            <BigTotal label="Meal total" value={formatPeso(ingredients.reduce((sum, r) => sum + (typeof r.price === 'number' ? r.price : 0), 0))} sub="Adds up from the ingredients" color={colors.planned} />
            <FormGroup>
              <InputRow label="Name" value={nameIn} onChangeText={setNameIn} placeholder="e.g. Chicken adobo" autoFocus={!sheet.id} testID="groceries-name-input" />
            </FormGroup>
            <GroupLabel>Ingredients</GroupLabel>
            <FormGroup>
              {ingredients.map((ing, i) => (
                <View key={ing.id} style={styles.formItemRow}>
                  <TextInput
                    autoFocus={ing.id === focusIngredientId}
                    style={styles.formItemName}
                    placeholder={`Ingredient ${i + 1}`}
                    placeholderTextColor={colors.inkFaint}
                    value={ing.name}
                    onChangeText={(t) => setIngredients((rows) => rows.map((r) => (r.id === ing.id ? { ...r, name: t } : r)))}
                  />
                  <AmountInput
                    value={ing.price}
                    onChangeAmount={(v) => setIngredients((rows) => rows.map((r) => (r.id === ing.id ? { ...r, price: v } : r)))}
                    placeholder="0.00"
                    style={{ backgroundColor: 'transparent', marginBottom: 0, minHeight: 44, paddingHorizontal: 0, justifyContent: 'flex-end' }}
                    inputStyle={{ textAlign: 'right', flex: 0, minWidth: 80, color: colors.planned }}
                  />
                  <TouchableOpacity
                    onPress={() => setIngredients((rows) => rows.filter((r) => r.id !== ing.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ingredient ${i + 1}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.inkFaint} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => { const id = makeId('ing'); setIngredients((rows) => [...rows, { id, name: '', price: '' }]); setFocusIngredientId(id); }}
                accessibilityRole="button"
                style={styles.formAddRow}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold }}>+ Add ingredient</Text>
              </TouchableOpacity>
            </FormGroup>
          </>
        )}
        {!!sheet?.id && (
          <TouchableOpacity onPress={deleteFromSheet} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ fontSize: 17, color: colors.error }}>{sheet.kind === 'meal' ? 'Delete meal' : 'Delete item'}</Text>
          </TouchableOpacity>
        )}
      </BottomSheet>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    formItemRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16 },
    formItemName: { flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 12, marginRight: 8 },
    formAddRow: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
    container: { flex: 1, backgroundColor: 'transparent' },
    segRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    trio: { flexDirection: 'row' },
    trioCell: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    trioLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4 },
    meta: { fontSize: 13, color: colors.inkDim },
    headline: { fontSize: 17, fontWeight: '600', color: colors.ink },
    hero: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
    subhead: { fontSize: 15, color: colors.inkDim, marginTop: 2, textAlign: 'center' },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginHorizontal: 16 },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 10 },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.inkDim, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    title: { fontSize: 17, color: colors.ink },
    done: { color: colors.inkDim, textDecorationLine: 'line-through' },
    amount: { fontSize: 17, fontWeight: '600' },
    primary: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16, overflow: 'hidden', paddingHorizontal: 16 },
    primaryText: { fontSize: 17, fontWeight: '600' },
    inlineInput: { flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 4 },
    addBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: colors.navy1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    chipText: { fontSize: 13, fontWeight: '500', color: colors.inkDim },
  });
}
