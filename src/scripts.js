// IMPORTS
import './styles.css';
import MicroModal from 'micromodal';

import RecipeRepository from './classes/RecipeRepository';
import IngredientRepository from './classes/IngredientRepository';
import User from './classes/User';
import {
  fetchUsers,
  fetchIngredients,
  fetchRecipes,
  userData,
  ingredientsData,
  recipeData,
} from './apiCalls';

// SELECTORS;
const showAllRecipeBtn = document.getElementById('show-all-recipes');
const showRecipeByTagBtn = document.getElementById('show-recipe-by-tag');
const showFavBtn = document.getElementById('show-favorites');
const showQueueBtn = document.getElementById('show-queue');

const recipeTagForm = document.getElementById('recipe-tag-form');
const searchInputField = document.getElementById('search-input-field');
const searchBtn = document.getElementById('search-button');

const recipeContainer = document.getElementById('recipe-container');
const poolAndSearchView = document.getElementById('pool-and-search-parent');
const recipePoolView = document.querySelector('.recipe-pool-view');
const recipeDetailView = document.querySelector('.recipe-detail-view');
let favoriteModal = document.getElementById('favorite-recipe-modal');

// GLOBAL VARIABLES
let recipeRepository;
let ingredientRepository;
let recipePool;
// let recipePoolTags;
let ingredientPool;
let selectedTags;
let user;

window.addEventListener('load', getApis);

function getApis() {
  Promise.all([fetchUsers(), fetchIngredients(), fetchRecipes()]).then(
    (allArrays) => storeData(allArrays)
  );
}

function storeData(arrays) {
  arrays[0].forEach((user) => userData.push(user));
  arrays[1].forEach((ingredient) => ingredientsData.push(ingredient));
  arrays[2].forEach((recipe) => recipeData.push(recipe));
  createUserAndRecipePool();
}

function createUserAndRecipePool() {
  generateRandomUser();
  generateAllRecipes();
  generateAllIngredients();
}

// BUTTONS
showAllRecipeBtn.addEventListener('click', function () {
  recipePool = recipeRepository.recipes;
  showRecipePool();
  generateAllTags();
});

showFavBtn.addEventListener('click', showFavorite);

showQueueBtn.addEventListener('click', showQueue);

// FORM
recipeTagForm.addEventListener('click', function () {
  collectTags();
  showRecipePool();
});

searchBtn.addEventListener('click', function () {
  recipePool = [];
  searchByName();
  searchByIngredient();
  showRecipePool();
});

recipePoolView.addEventListener('click', showRecipeDetails);

// FUNCTIONS
function generateAllRecipes() {
  recipeRepository = new RecipeRepository(recipeData);
  recipeRepository.makeRecipes();
  recipePool = recipeRepository.recipes;
}

function generateAllIngredients() {
  ingredientRepository = new IngredientRepository(ingredientsData);
  ingredientRepository.makeIngredients();
  ingredientPool = ingredientRepository.ingredients;
}

function generateAllTags() {
  let recipeTags = [];
  recipePool.forEach((recipe) => {
    recipeTags.push(recipe.tags);
  });
  let uniqRecipeTags = [...new Set(recipeTags.flat())];
  recipeTagForm.innerHTML = '';
  uniqRecipeTags.forEach((tag) => {
    recipeTagForm.innerHTML += `
      <input type="checkbox" class="recipe-tag' id="${tag}" value="${tag}"></input>
      <label for="${tag}">${tag}</label>
    `;
  });
}

function generateRandomUser() {
  let randomIndex = Math.floor(Math.random() * userData.length);
  let randomUser = userData[randomIndex];
  user = new User(randomUser);
}

function showRecipePool() {
  hide(recipeDetailView);
  show(poolAndSearchView);
  recipePoolView.innerHTML = '';
  recipePool.forEach((recipe) => {
    recipePoolView.innerHTML += `
      <article id="${recipe.id}">
        <img src=${recipe.image}>
        <p>${recipe.name}</p>
      </article>
    `;
  });
}

function collectTags() {
  selectedTags = [];
  let checkBoxes = document.querySelectorAll('input[type=checkbox]:checked');
  for (let i = 0; i < checkBoxes.length; i++) {
    selectedTags.push(checkBoxes[i].value);
  }
  if (selectedTags.length === 0) {
    recipePool = recipeRepository.recipes;
    showRecipePool();
  } else {
    showRecipesByTag();
  }
}

function showRecipesByTag() {
  if (user.favoriteRecipes.length === 0) {
    recipePool = recipeRepository.returnRecipesByTag(selectedTags);
  } else {
    user.selectedFavTags = selectedTags;
    recipePool = user.filterFavoriteRecipesByTag();
  }
}

function searchByName() {
  event.preventDefault();
  if (searchInputField.value) {
    recipePool = recipeRepository.returnRecipesByName(
      'name',
      searchInputField.value
    );
  }
}

function searchByIngredient() {
  event.preventDefault();
  let ingredientIds = ingredientRepository.getIngredientId(
    searchInputField.value
  );
  let recipesContainingIngredient =
    recipeRepository.returnRecipesByIngredient(ingredientIds);
  recipesContainingIngredient.forEach((recipe) => {
    if (!recipePool.some((el) => el.name === recipe.name)) {
      recipePool.push(recipe);
    }
  });
}

function showRecipeDetails(event) {
  let recipeId = event.target.parentNode.id;
  let recipeClicked = recipePool.find((ele) => ele.id == recipeId);
  let ingredients = recipeClicked.showIngredientsByName().join(', ');
  let instructions = recipeClicked.showInstructions();
  let cost = recipeClicked.calculateRecipeCostInDollars();
  hide(poolAndSearchView);
  show(recipeDetailView);

  recipeDetailView.innerHTML = `
    <article class="recipe-detail-container">
      <h3>${recipeClicked.name}</h3>
      <img src="${recipeClicked.image}">
      <button id="fave-button">
        <span id="fave-text">Add to favorites</span>
        <span id="unfave-text" class="hidden">Remove from favorites</span>
      </button>
      <button id="add-to-recipes-to-cook-button">
        <span id="add-to-cook-text">Add to Recipes to Cook</span>
        <span id="remove-from-cook-text" class="hidden">Remove From Recipes to Cook</span>
      </button>
      <p>Ingredients: <span>${ingredients}</span></p>
      <p>Total cost: <span>$${cost}</span></p>
    </article>
  `;

  instructions.forEach((ele) => {
    let key = Object.keys(ele).toString();
    let instruction = Object.values(ele).toString();
    recipeDetailView.innerHTML += `
    <span>Step ${key}</span>
    <p>${instruction}</p>
    `;
  });

  activateFaveButton(recipeClicked);
  activateAddToRecipesToCookButton(recipeClicked);
}

function activateFaveButton(recipeClicked) {
  let faveButton = document.getElementById('fave-button');
  let faveText = document.getElementById('fave-text');
  let unFaveText = document.getElementById('unfave-text');

  if (user.favoriteRecipes.includes(recipeClicked)) {
    resetClassList(faveText);
    resetClassList(unFaveText);
    hide(faveText);
  }

  faveButton.addEventListener('click', function () {
    if (!user.favoriteRecipes.includes(recipeClicked)) {
      user.favoriteRecipes.push(recipeClicked);
      hide(faveText);
      show(unFaveText);
    } else {
      let indexOfRecipeClicked = user.favoriteRecipes.indexOf(recipeClicked);
      user.favoriteRecipes.splice(indexOfRecipeClicked, 1);
      toggle(faveText);
      toggle(unFaveText);
    }
  });
}

function showFavorite() {
  hide(recipeDetailView);
  show(poolAndSearchView);
  if (user.favoriteRecipes.length === 0) {
    let span = document.getElementsByClassName('close')[0];
    showFavBtn.onclick = function () {
      favoriteModal.style.display = 'block';
    };
    span.onclick = function () {
      favoriteModal.style.display = 'none';
    };
    window.onclick = function (event) {
      if (event.target == favoriteModal) {
        favoriteModal.style.display = 'none';
      }
    };
  } else {
    showFavBtn.onclick = function () {
      favoriteModal.style.display = 'none';
    };
    recipePool = user.favoriteRecipes;
    console.log(recipePool);
    showRecipePool();
    generateAllTags();
  }
}

function activateAddToRecipesToCookButton(recipeClicked) {
  let addToRecipesToCookButton = document.getElementById(
    'add-to-recipes-to-cook-button'
  );
  let addToCookText = document.getElementById('add-to-cook-text');
  let removeFromCookText = document.getElementById('remove-from-cook-text');

  if (user.recipesToCook.includes(recipeClicked)) {
    resetClassList(addToCookText);
    resetClassList(removeFromCookText);
    hide(addToCookText);
  }

  addToRecipesToCookButton.addEventListener('click', function () {
    if (!user.recipesToCook.includes(recipeClicked)) {
      user.recipesToCook.push(recipeClicked);
      hide(addToCookText);
      show(removeFromCookText);
    } else {
      let indexOfRecipeClicked = user.recipesToCook.indexOf(recipeClicked);
      user.recipesToCook.splice(indexOfRecipeClicked, 1);
      toggle(addToCookText);
      toggle(removeFromCookText);
    }
  });
}

function showQueue() {
  hide(recipeDetailView);
  show(poolAndSearchView);
  if (user.recipesToCook.length === 0) {
    var modal = document.getElementById('recipes-to-cook-modal');
    var span = document.getElementsByClassName('close-recipe-to-cook-modal')[0];
    showQueueBtn.onclick = function () {
      modal.style.display = 'block';
    };
    span.onclick = function () {
      modal.style.display = 'none';
    };
  } else {
    recipePool = user.recipesToCook;
    showRecipePool();
  }
  generateAllTags();
}

// UTILITY FUNCTIONS
function show(element) {
  element.classList.remove('hidden');
}

function hide(element) {
  element.classList.add('hidden');
}

function toggle(element) {
  element.classList.toggle('hidden');
}

function resetClassList(element) {
  element.classList = '';
}
