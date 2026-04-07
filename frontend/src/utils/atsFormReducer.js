export const formActionTypes = {
  setField: "set_field",
  patchFields: "patch_fields",
  replaceForm: "replace_form",
  resetForm: "reset_form",
  setNestedItem: "set_nested_item",
  addNestedItem: "add_nested_item",
  removeNestedItem: "remove_nested_item"
};

export const formReducer = (state, action) => {
  switch (action.type) {
    case formActionTypes.setField:
      return {
        ...state,
        [action.name]: action.value
      };
    case formActionTypes.patchFields:
      return {
        ...state,
        ...action.payload
      };
    case formActionTypes.replaceForm:
    case formActionTypes.resetForm:
      return { ...action.payload };
    case formActionTypes.setNestedItem:
      return {
        ...state,
        [action.name]: state[action.name].map((item, index) => (
          index === action.index
            ? { ...item, [action.field]: action.value }
            : item
        ))
      };
    case formActionTypes.addNestedItem:
      return {
        ...state,
        [action.name]: [...state[action.name], action.item]
      };
    case formActionTypes.removeNestedItem: {
      const nextItems = state[action.name].filter((_, index) => index !== action.index);
      return {
        ...state,
        [action.name]: nextItems.length ? nextItems : [action.fallbackItem]
      };
    }
    default:
      return state;
  }
};
